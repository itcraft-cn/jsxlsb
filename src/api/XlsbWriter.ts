import { CellData } from '../core/cell/CellData';
import { ZipWriter } from '../core/container/ZipWriter';
import { ZipReader } from '../core/container/ZipReader';
import { SharedStringsTable } from '../core/sst/SharedStringsTable';
import { WorkbookWriter } from '../core/workbook/WorkbookWriter';
import { SheetWriter, CellDataSupplier } from '../core/sheet/SheetWriter';
import { StylesWriter } from '../core/style/StylesWriter';
import { TemplateReader } from '../core/template/TemplateReader';
import { SheetParser, CellInfo, MergeCell, MarkerPosition } from '../core/template/SheetParser';
import { ContentTypes } from '../core/xml/ContentTypes';
import { RelsGenerator } from '../core/xml/RelsGenerator';
import { XmlGenerator } from '../core/xml/XmlGenerator';
import { isNode } from '../core/env/EnvDetector';

export interface XlsbWriterOptions {
  path?: string;
  buffer?: boolean;
  templatePath?: string;
  templateBuffer?: Uint8Array;
}

export class XlsbWriter {
  private container: ZipWriter;
  private sharedStrings: SharedStringsTable;
  private workbookWriter: WorkbookWriter;
  private stylesWriter: StylesWriter;
  private sheetWriter: SheetWriter;
  private sheetCount: number = 0;

  private currentSheetName: string | null = null;
  private currentColumnCount: number = 0;
  private currentRowCount: number = 0;

  private outputPath?: string;
  private bufferMode: boolean = false;

  private isTemplateMode: boolean = false;
  private templateReader: TemplateReader | null = null;
  private templateSheetCount: number = 0;

  private currentFillSheetIndex: number = -1;
  private fillStartRow: number = 0;
  private fillStartCol: number = 0;
  private fillRowCount: number = 0;
  private streamingTemplateCells: CellInfo[] = [];
  private streamingTemplateMaxRow: number = 0;
  private streamingTemplateMaxCol: number = 0;
  private streamingMergeCells: MergeCell[] = [];
  private streamingAccumulatedData: any[][] = [];

  private constructor(options: XlsbWriterOptions) {
    this.container = new ZipWriter();
    this.sharedStrings = new SharedStringsTable();
    this.stylesWriter = new StylesWriter();
    this.workbookWriter = new WorkbookWriter();
    this.sheetWriter = new SheetWriter(this.sharedStrings, this.stylesWriter);

    if (options.path) {
      this.outputPath = options.path;
    }
    if (options.buffer) {
      this.bufferMode = true;
    }

    if (options.templatePath || options.templateBuffer) {
      this.isTemplateMode = true;
      const templateBuffer = options.templateBuffer || this.loadTemplateFile(options.templatePath!);
      this.templateReader = new TemplateReader(templateBuffer);
      this.templateSheetCount = this.templateReader.getSheetCount();
      this.copyTemplateStyles();
    }
  }

  private loadTemplateFile(path: string): Uint8Array {
    if (typeof require !== 'undefined') {
      const fs = require('fs');
      return new Uint8Array(fs.readFileSync(path));
    }
    throw new Error('Template path requires Node.js environment');
  }

  private copyTemplateStyles(): void {
    if (!this.templateReader) return;

    const templateContainer = new ZipReader(this.templateReader.getContainer().getBuffer());

    const stylesBuffer = templateContainer.getEntryData('xl/styles.bin');
    if (stylesBuffer) {
      this.container.addEntry('xl/styles.bin', stylesBuffer);
    }

    const themeBuffer = templateContainer.getEntryData('xl/theme/theme1.xml');
    if (themeBuffer) {
      this.container.addEntry('xl/theme/theme1.xml', themeBuffer);
    }

    const appBuffer = templateContainer.getEntryData('docProps/app.xml');
    if (appBuffer) {
      this.container.addEntry('docProps/app.xml', appBuffer);
    }

    const coreBuffer = templateContainer.getEntryData('docProps/core.xml');
    if (coreBuffer) {
      this.container.addEntry('docProps/core.xml', coreBuffer);
    }
  }

  writeBatch(sheetName: string, data: CellData[][]): void {
    if (this.isTemplateMode) {
      throw new Error('Template mode: use fillBatch() instead of writeBatch()');
    }

    const rowCount = data.length;
    const columnCount = rowCount > 0 ? data[0].length : 0;

    const supplier: CellDataSupplier = {
      get(row: number, col: number): CellData | null {
        if (row < data.length && col < data[row].length) {
          return data[row][col];
        }
        return null;
      }
    };

    this.workbookWriter.addSheet(sheetName);
    const sheetData = this.sheetWriter.writeSheet(supplier, rowCount, columnCount);
    this.container.addEntry(`xl/worksheets/sheet${this.sheetCount + 1}.bin`, sheetData);
    this.sheetCount++;
  }

  startSheet(sheetName: string, columnCount: number): void {
    if (this.isTemplateMode) {
      throw new Error('Template mode: use startFill() instead of startSheet()');
    }

    if (this.currentSheetName) {
      throw new Error('Previous sheet not ended, call endSheet() first');
    }
    this.currentSheetName = sheetName;
    this.currentColumnCount = columnCount;
    this.currentRowCount = 0;
    this.sheetWriter.startStreaming(columnCount);
  }

  writeRows(data: CellData[][]): void {
    if (!this.currentSheetName) {
      throw new Error('Sheet not started, call startSheet() first');
    }

    const startRow = this.currentRowCount;
    const columnCount = this.currentColumnCount;

    const supplier: CellDataSupplier = {
      get(row: number, col: number): CellData | null {
        const index = row - startRow;
        if (index >= 0 && index < data.length && col < data[index].length) {
          return data[index][col];
        }
        return null;
      }
    };

    this.sheetWriter.appendRows(supplier, startRow, data.length, columnCount);
    this.currentRowCount += data.length;
  }

  endSheet(): void {
    if (!this.currentSheetName) {
      throw new Error('Sheet not started');
    }

    this.workbookWriter.addSheet(this.currentSheetName);
    const sheetData = this.sheetWriter.finalizeStreaming(this.currentRowCount, this.currentColumnCount);
    this.container.addEntry(`xl/worksheets/sheet${this.sheetCount + 1}.bin`, sheetData);
    this.sheetCount++;

    this.currentSheetName = null;
    this.currentColumnCount = 0;
    this.currentRowCount = 0;
  }

  getTemplateSheetCount(): number {
    if (!this.isTemplateMode) {
      throw new Error('Not in template mode');
    }
    return this.templateSheetCount;
  }

  getTemplateSheetInfos(): any[] {
    if (!this.isTemplateMode) {
      throw new Error('Not in template mode');
    }
    return this.templateReader!.getSheetInfos();
  }

  fillBatch(sheetIndex: number, dataList: any[][], startRow: number, startCol: number): void {
    if (!this.isTemplateMode) {
      throw new Error('Not in template mode: use writeBatch() instead');
    }

    if (sheetIndex < 0 || sheetIndex >= this.templateSheetCount) {
      throw new Error(`Invalid sheet index: ${sheetIndex}`);
    }

    const parser = this.templateReader!.parseSheet(sheetIndex);
    const templateCells = parser.parse();
    const templateMaxRow = parser.getMaxRow();
    const templateMaxCol = parser.getMaxCol();
    const mergeCells = parser.getMergeCells();

    const rowCount = dataList.length;
    const columnCount = dataList.length > 0 ? Math.max(dataList[0].length, parser.getMaxCol() + 1 - startCol) : 4;

    const supplier: CellDataSupplier = {
      get(row: number, col: number): CellData | null {
        const index = row - startRow;
        if (index >= 0 && index < dataList.length) {
          const rowData = dataList[index];
          const colIndex = col - startCol;
          if (colIndex >= 0 && colIndex < rowData.length) {
            return SheetParser.toCellData(rowData[colIndex]);
          }
        }
        return CellData.blank();
      }
    };

    const sheetData = this.sheetWriter.writeSheetWithTemplate(
      supplier, rowCount, columnCount,
      startRow, startCol,
      templateCells, templateMaxRow, templateMaxCol, mergeCells
    );

    this.container.addEntry(`xl/worksheets/sheet${sheetIndex + 1}.bin`, sheetData);
    this.sheetCount++;
  }

  fillAtMarker(sheetIndex: number, marker: string, dataList: any[][]): void {
    if (!this.isTemplateMode) {
      throw new Error('Not in template mode');
    }

    const pos = this.templateReader!.findMarker(sheetIndex, marker);
    if (!pos) {
      throw new Error(`Marker not found: ${marker}`);
    }

    this.fillBatch(sheetIndex, dataList, pos.row, pos.col);
  }

  startFill(sheetIndex: number, startRow: number, startCol: number): void {
    if (!this.isTemplateMode) {
      throw new Error('Not in template mode');
    }

    if (this.currentFillSheetIndex >= 0) {
      throw new Error('Previous fill not ended, call endFill() first');
    }

    if (sheetIndex < 0 || sheetIndex >= this.templateSheetCount) {
      throw new Error(`Invalid sheet index: ${sheetIndex}`);
    }

    this.currentFillSheetIndex = sheetIndex;
    this.fillStartRow = startRow;
    this.fillStartCol = startCol;
    this.fillRowCount = 0;

    const parser = this.templateReader!.parseSheet(sheetIndex);
    this.streamingTemplateCells = parser.parse();
    this.streamingTemplateMaxRow = parser.getMaxRow();
    this.streamingTemplateMaxCol = parser.getMaxCol();
    this.streamingMergeCells = parser.getMergeCells();
    this.streamingAccumulatedData = [];
  }

  fillRows(dataList: any[][]): void {
    if (!this.isTemplateMode) {
      throw new Error('Not in template mode');
    }

    if (this.currentFillSheetIndex < 0) {
      throw new Error('Fill not started, call startFill() first');
    }

    for (const row of dataList) {
      this.streamingAccumulatedData.push(row);
    }
    this.fillRowCount = this.streamingAccumulatedData.length;
  }

  endFill(): void {
    if (!this.isTemplateMode) {
      throw new Error('Not in template mode');
    }

    if (this.currentFillSheetIndex < 0) {
      throw new Error('Fill not started');
    }

    const rowCount = this.streamingAccumulatedData.length;
    const columnCount = Math.max(
      this.streamingTemplateMaxCol + 1 - this.fillStartCol,
      rowCount > 0 ? this.streamingAccumulatedData[0].length : 4
    );

    const self = this;
    const supplier: CellDataSupplier = {
      get(row: number, col: number): CellData | null {
        const index = row - self.fillStartRow;
        if (index >= 0 && index < self.streamingAccumulatedData.length) {
          const rowData = self.streamingAccumulatedData[index];
          const colIndex = col - self.fillStartCol;
          if (colIndex >= 0 && colIndex < rowData.length) {
            return SheetParser.toCellData(rowData[colIndex]);
          }
        }
        return CellData.blank();
      }
    };

    const sheetData = this.sheetWriter.writeSheetWithTemplate(
      supplier, rowCount, columnCount,
      this.fillStartRow, this.fillStartCol,
      this.streamingTemplateCells, this.streamingTemplateMaxRow, this.streamingTemplateMaxCol,
      this.streamingMergeCells
    );

    this.container.addEntry(`xl/worksheets/sheet${this.currentFillSheetIndex + 1}.bin`, sheetData);
    this.sheetCount++;

    this.currentFillSheetIndex = -1;
    this.streamingAccumulatedData = [];
    this.streamingTemplateCells = [];
  }

  close(): Uint8Array | void {
    if (this.sheetCount === 0 && !this.isTemplateMode) {
      throw new Error('No sheets written');
    }

    if (this.isTemplateMode && this.sheetCount === 0) {
      throw new Error('No data filled in template mode');
    }

    this.writeContainerStructure();

    const result = this.container.toUint8Array();

    if (this.outputPath && isNode) {
      this.writeFile(result);
    }

    if (this.templateReader) {
      this.templateReader.close();
    }

    return result;
  }

  private writeContainerStructure(): void {
    if (this.isTemplateMode) {
      const ct = new ContentTypes();
      ct.addOverride('/xl/workbook.bin', 'application/vnd.ms-excel.workbook');
      for (let i = 1; i <= this.templateSheetCount; i++) {
        ct.addOverride(`/xl/worksheets/sheet${i}.bin`, 'application/vnd.ms-excel.worksheet');
      }
      if (this.container.hasEntry('xl/styles.bin')) {
        ct.addOverride('/xl/styles.bin', 'application/vnd.ms-excel.styles');
      }
      if (this.container.hasEntry('xl/theme/theme1.xml')) {
        ct.addOverride('/xl/theme/theme1.xml', 'application/vnd.openxmlformats-officedocument.theme+xml');
      }
      this.container.addEntry('[Content_Types].xml', ct.toUint8Array());

      this.container.addEntry('_rels/.rels', RelsGenerator.toUint8Array(RelsGenerator.generateRootRels()));
      this.container.addEntry('xl/workbook.bin', this.workbookWriter.toBiff12Bytes());
      this.container.addEntry('xl/_rels/workbook.bin.rels',
        RelsGenerator.toUint8Array(RelsGenerator.generateWorkbookRels(this.templateSheetCount, true)));

      if (this.sharedStrings.getCount() > 0) {
        this.container.addEntry('xl/sharedStrings.bin', this.sharedStrings.toBiff12Bytes());
      }
    } else {
      const ct = new ContentTypes();
      ct.addOverride('/docProps/app.xml', 'application/vnd.openxmlformats-officedocument.extended-properties+xml');
      ct.addOverride('/docProps/core.xml', 'application/vnd.openxmlformats-package.core-properties+xml');
      ct.addOverride('/xl/sharedStrings.bin', 'application/vnd.ms-excel.sharedStrings');
      ct.addOverride('/xl/styles.bin', 'application/vnd.ms-excel.styles');
      ct.addOverride('/xl/theme/theme1.xml', 'application/vnd.openxmlformats-officedocument.theme+xml');
      for (let i = 1; i <= this.sheetCount; i++) {
        ct.addOverride(`/xl/worksheets/sheet${i}.bin`, 'application/vnd.ms-excel.worksheet');
      }
      this.container.addEntry('[Content_Types].xml', ct.toUint8Array());

      this.container.addEntry('_rels/.rels', RelsGenerator.toUint8Array(RelsGenerator.generateRootRels()));
      this.container.addEntry('docProps/app.xml', XmlGenerator.toUint8Array(XmlGenerator.generateAppXml(this.sheetCount)));
      this.container.addEntry('docProps/core.xml', XmlGenerator.toUint8Array(XmlGenerator.generateCoreXml()));
      this.container.addEntry('xl/workbook.bin', this.workbookWriter.toBiff12Bytes());
      this.container.addEntry('xl/styles.bin', this.stylesWriter.toBiff12Bytes());
      this.container.addEntry('xl/theme/theme1.xml', XmlGenerator.toUint8Array(XmlGenerator.generateThemeXml()));
      this.container.addEntry('xl/_rels/workbook.bin.rels',
        RelsGenerator.toUint8Array(RelsGenerator.generateWorkbookRels(this.sheetCount, this.sharedStrings.getCount() > 0)));

      if (this.sharedStrings.getCount() > 0) {
        this.container.addEntry('xl/sharedStrings.bin', this.sharedStrings.toBiff12Bytes());
      }
    }
  }

  private writeFile(data: Uint8Array): void {
    if (typeof require !== 'undefined') {
      const fs = require('fs');
      if (this.outputPath) {
        fs.writeFileSync(this.outputPath, data);
      }
    }
  }

  static builder(): XlsbWriterBuilder {
    return new XlsbWriterBuilder();
  }
}

class XlsbWriterBuilder {
  private options: XlsbWriterOptions = {};

  path(filePath: string): XlsbWriterBuilder {
    this.options.path = filePath;
    return this;
  }

  buffer(): XlsbWriterBuilder {
    this.options.buffer = true;
    return this;
  }

  template(templatePath: string): XlsbWriterBuilder {
    this.options.templatePath = templatePath;
    return this;
  }

  templateBuffer(buffer: Uint8Array): XlsbWriterBuilder {
    this.options.templateBuffer = buffer;
    return this;
  }

  build(): XlsbWriter {
    return new XlsbWriter(this.options);
  }
}
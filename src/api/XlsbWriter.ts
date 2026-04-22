import { CellData } from '../core/cell/CellData';
import { ZipWriter } from '../core/container/ZipWriter';
import { SharedStringsTable } from '../core/sst/SharedStringsTable';
import { WorkbookWriter } from '../core/workbook/WorkbookWriter';
import { SheetWriter, CellDataSupplier } from '../core/sheet/SheetWriter';
import { StylesWriter } from '../core/style/StylesWriter';
import { ContentTypes } from '../core/xml/ContentTypes';
import { RelsGenerator } from '../core/xml/RelsGenerator';
import { XmlGenerator } from '../core/xml/XmlGenerator';
import { isNode } from '../core/env/EnvDetector';

export interface XlsbWriterOptions {
  path?: string;
  buffer?: boolean;
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
  }

  writeBatch(sheetName: string, data: CellData[][]): void {
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

  close(): Uint8Array | void {
    if (this.sheetCount > 0) {
      this.writeContainerStructure();
    }

    const result = this.container.toUint8Array();

    if (this.outputPath && isNode) {
      this.writeFile(result);
    }

    return result;
  }

  private writeContainerStructure(): void {
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

  build(): XlsbWriter {
    return new XlsbWriter(this.options);
  }
}
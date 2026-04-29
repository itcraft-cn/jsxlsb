import { ZipReader } from '../container/ZipReader';
import { SharedStringsTable } from '../sst/SharedStringsTable';
import { WorkbookReader } from '../workbook/WorkbookReader';
import { SheetParser, CellInfo, MergeCell, MarkerPosition } from './SheetParser';
import { SheetInfo } from '../../api/interfaces';

export class TemplateReader {
  private container: ZipReader;
  private sst: SharedStringsTable;
  private sheetInfos: SheetInfo[];
  private sheetCount: number;

  constructor(buffer: Uint8Array) {
    this.container = new ZipReader(buffer);
    this.sst = this.loadSharedStringsTable();
    this.sheetInfos = this.loadSheetInfos();
    this.sheetCount = this.sheetInfos.length;
  }

  getContainer(): ZipReader {
    return this.container;
  }

  private loadSharedStringsTable(): SharedStringsTable {
    const sstBuffer = this.container.getEntryData('xl/sharedStrings.bin');
    const table = new SharedStringsTable();
    if (sstBuffer) {
      table.load(sstBuffer);
    }
    return table;
  }

  private loadSheetInfos(): SheetInfo[] {
    const workbookBuffer = this.container.getEntryData('xl/workbook.bin');
    if (!workbookBuffer) {
      throw new Error('workbook.bin not found in template');
    }
    const reader = new WorkbookReader(workbookBuffer);
    return reader.parseSheetList();
  }

  getSheetCount(): number {
    return this.sheetCount;
  }

  getSheetInfos(): SheetInfo[] {
    return this.sheetInfos;
  }

  getSheetBuffer(sheetIndex: number): Uint8Array {
    const sheetPath = `xl/worksheets/sheet${sheetIndex + 1}.bin`;
    const buffer = this.container.getEntryData(sheetPath);
    if (!buffer) {
      throw new Error(`Sheet ${sheetIndex} not found: ${sheetPath}`);
    }
    return buffer;
  }

  parseSheet(sheetIndex: number): SheetParser {
    const buffer = this.getSheetBuffer(sheetIndex);
    return new SheetParser(buffer, this.sst);
  }

  getSharedStringsTable(): SharedStringsTable {
    return this.sst;
  }

  findMarker(sheetIndex: number, marker: string): MarkerPosition | null {
    const parser = this.parseSheet(sheetIndex);
    parser.parse();
    return parser.findMarker(marker);
  }

  close(): void {
  }
}
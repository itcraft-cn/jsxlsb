import { CellData } from '../core/cell/CellData';
import { CellType } from '../core/cell/CellType';
import { ZipReader } from '../core/container/ZipReader';
import { SharedStringsTable } from '../core/sst/SharedStringsTable';
import { StylesReader } from '../core/style/StylesReader';
import { WorkbookReader } from '../core/workbook/WorkbookReader';
import { SheetReader, BatchCompleteException, InternalRowHandler } from '../core/sheet/SheetReader';
import { SheetInfo, RowHandler } from './interfaces';

export interface XlsbReaderOptions {
  path?: string;
  buffer?: Uint8Array;
}

export class XlsbReader {
  private container: ZipReader;
  private sst: SharedStringsTable;
  private styles: StylesReader;
  private buffer: Uint8Array;

  private constructor(buffer: Uint8Array) {
    this.buffer = buffer;
    this.container = new ZipReader(buffer);
    this.sst = this.loadSharedStringsTable();
    this.styles = this.loadStylesTable();
  }

  private loadSharedStringsTable(): SharedStringsTable {
    const sstBuffer = this.container.getEntryData('xl/sharedStrings.bin');
    const table = new SharedStringsTable();
    if (sstBuffer) {
      table.load(sstBuffer);
    }
    return table;
  }

  private loadStylesTable(): StylesReader {
    const stylesBuffer = this.container.getEntryData('xl/styles.bin');
    const styles = new StylesReader();
    if (stylesBuffer) {
      styles.load(stylesBuffer);
    }
    return styles;
  }

  getSheetInfos(): SheetInfo[] {
    const workbookBuffer = this.container.getEntryData('xl/workbook.bin');
    if (!workbookBuffer) {
      throw new Error('workbook.bin not found');
    }
    const reader = new WorkbookReader(workbookBuffer);
    return reader.parseSheetList();
  }

  forEachRow(sheetIndex: number, handler: RowHandler): void {
    const sheetBuffer = this.getSheetBuffer(sheetIndex);
    const sheetReader = new SheetReader(sheetBuffer, this.sst);
    const styles = this.styles;

    const internalHandler: InternalRowHandler = {
      onRowStart(rowIndex: number, columnCount: number) {
        handler.onRowStart(rowIndex, columnCount);
      },
      onCellNumber(row: number, col: number, value: number, styleIndex: number) {
        const formatCode = styles.getFormatCode(styleIndex);
        handler.onCell(row, col, CellData.number(value, formatCode));
      },
      onCellText(row: number, col: number, value: string, styleIndex: number) {
        handler.onCell(row, col, CellData.text(value));
      },
      onCellBoolean(row: number, col: number, value: boolean, styleIndex: number) {
        handler.onCell(row, col, CellData.bool(value));
      },
      onCellBlank(row: number, col: number, styleIndex: number) {
        handler.onCell(row, col, CellData.blank());
      },
      onRowEnd(rowIndex: number) {
        handler.onRowEnd(rowIndex);
      }
    };

    sheetReader.readRows(internalHandler);
  }

  readRows(sheetIndex: number, startRow: number, batchSize: number): CellData[][] {
    const endRow = startRow + batchSize - 1;
    const result: CellData[][] = [];
    let currentRowData: CellData[] = [];
    let maxColInRow = -1;
    const estimatedColumns = 100;

    const sheetBuffer = this.getSheetBuffer(sheetIndex);
    const sheetReader = new SheetReader(sheetBuffer, this.sst);
    const styles = this.styles;

    try {
      sheetReader.readRows({
        onRowStart(rowIndex: number, colCount: number) {
          if (rowIndex >= startRow && rowIndex <= endRow) {
            const actualColCount = Math.max(colCount, estimatedColumns);
            currentRowData = new Array(actualColCount).fill(null);
            maxColInRow = -1;
          } else if (rowIndex > endRow) {
            throw new BatchCompleteException();
          }
        },
        onCellNumber(row: number, col: number, value: number, styleIndex: number) {
          if (row >= startRow && row <= endRow) {
            if (col >= currentRowData.length) {
              const newData = new Array(col + 1).fill(null);
              for (let i = 0; i < currentRowData.length; i++) {
                newData[i] = currentRowData[i];
              }
              currentRowData = newData;
            }
            const formatCode = styles.getFormatCode(styleIndex);
            currentRowData[col] = CellData.number(value, formatCode);
            maxColInRow = Math.max(maxColInRow, col);
          }
        },
        onCellText(row: number, col: number, value: string, styleIndex: number) {
          if (row >= startRow && row <= endRow) {
            if (col >= currentRowData.length) {
              const newData = new Array(col + 1).fill(null);
              for (let i = 0; i < currentRowData.length; i++) {
                newData[i] = currentRowData[i];
              }
              currentRowData = newData;
            }
            currentRowData[col] = CellData.text(value);
            maxColInRow = Math.max(maxColInRow, col);
          }
        },
        onCellBoolean(row: number, col: number, value: boolean, styleIndex: number) {
          if (row >= startRow && row <= endRow) {
            if (col >= currentRowData.length) {
              const newData = new Array(col + 1).fill(null);
              for (let i = 0; i < currentRowData.length; i++) {
                newData[i] = currentRowData[i];
              }
              currentRowData = newData;
            }
            currentRowData[col] = CellData.bool(value);
            maxColInRow = Math.max(maxColInRow, col);
          }
        },
        onCellBlank(row: number, col: number, styleIndex: number) {
          if (row >= startRow && row <= endRow) {
            if (col >= currentRowData.length) {
              const newData = new Array(col + 1).fill(null);
              for (let i = 0; i < currentRowData.length; i++) {
                newData[i] = currentRowData[i];
              }
              currentRowData = newData;
            }
            currentRowData[col] = CellData.blank();
            maxColInRow = Math.max(maxColInRow, col);
          }
        },
        onRowEnd(rowIndex: number) {
          if (rowIndex >= startRow && rowIndex <= endRow) {
            if (maxColInRow >= 0) {
              const trimmed = currentRowData.slice(0, maxColInRow + 1);
              result.push(trimmed);
            } else {
              result.push([]);
            }
          }
          if (rowIndex >= endRow) {
            throw new BatchCompleteException();
          }
        }
      });
    } catch (e) {
      if (!(e instanceof BatchCompleteException)) {
        throw e;
      }
    }

    return result;
  }

  private getSheetBuffer(sheetIndex: number): Uint8Array {
    const sheetPath = `xl/worksheets/sheet${sheetIndex + 1}.bin`;
    const buffer = this.container.getEntryData(sheetPath);
    if (!buffer) {
      throw new Error(`Sheet ${sheetIndex} not found: ${sheetPath}`);
    }
    return buffer;
  }

  hasSharedStrings(): boolean {
    return this.sst.getCount() > 0;
  }

  getStyles(): StylesReader {
    return this.styles;
  }

  close(): void {
  }

  static builder(): XlsbReaderBuilder {
    return new XlsbReaderBuilder();
  }

  static async fromFile(file: File): Promise<XlsbReader> {
    const buffer = await file.arrayBuffer();
    return new XlsbReader(new Uint8Array(buffer));
  }
}

class XlsbReaderBuilder {
  private options: XlsbReaderOptions = {};

  path(filePath: string): XlsbReaderBuilder {
    this.options.path = filePath;
    return this;
  }

  buffer(data: Uint8Array): XlsbReaderBuilder {
    this.options.buffer = data;
    return this;
  }

  build(): XlsbReader {
    if (this.options.buffer) {
      return new XlsbReader(this.options.buffer);
    }

    if (this.options.path && typeof require !== 'undefined') {
      const fs = require('fs');
      const data = fs.readFileSync(this.options.path);
      return new XlsbReader(new Uint8Array(data));
    }

    throw new Error('Either path or buffer must be specified');
  }
}
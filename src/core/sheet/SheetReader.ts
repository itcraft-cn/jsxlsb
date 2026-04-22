import { RecordTypes } from '../biff12/RecordTypes';
import {
  readVarInt,
  readVarSize,
  readIntLE,
  readDoubleLE,
  varIntSize,
  varSizeSize,
  decodeUTF16LE
} from '../biff12/VarInt';
import { SharedStringsTable } from '../sst/SharedStringsTable';
import { CellData } from '../cell/CellData';
import { CellType } from '../cell/CellType';

export interface InternalRowHandler {
  onRowStart(rowIndex: number, columnCount: number): void;
  onCellNumber(row: number, col: number, value: number, styleIndex: number): void;
  onCellText(row: number, col: number, value: string, styleIndex: number): void;
  onCellBoolean(row: number, col: number, value: boolean, styleIndex: number): void;
  onCellBlank(row: number, col: number, styleIndex: number): void;
  onRowEnd(rowIndex: number): void;
}

export class BatchCompleteException extends Error {
  constructor() {
    super('Batch complete');
    this.name = 'BatchCompleteException';
  }
}

export class SheetReader {
  private buffer: Uint8Array;
  private sst: SharedStringsTable;
  private currentRow: number = -1;
  private currentHandler: InternalRowHandler | null = null;

  constructor(buffer: Uint8Array, sst: SharedStringsTable) {
    this.buffer = buffer;
    this.sst = sst;
  }

  readRows(handler: InternalRowHandler): void {
    let pos = 0;

    try {
      while (pos + 2 <= this.buffer.length) {
        const recordType = readVarInt(this.buffer, pos);
        const typeSize = varIntSize(recordType);
        pos += typeSize;

        if (pos >= this.buffer.length) break;

        const recordSize = readVarSize(this.buffer, pos);
        const sizeBytes = varSizeSize(recordSize);
        pos += sizeBytes;

        if (recordSize < 0 || recordSize > this.buffer.length) {
          pos += Math.max(0, recordSize);
          continue;
        }

        if (recordSize > 0 && pos + recordSize > this.buffer.length) {
          break;
        }

        try {
          switch (recordType) {
            case RecordTypes.BrtRowHdr:
              this.handleBrtRowHdr(pos, recordSize, handler);
              break;

            case RecordTypes.BrtCellRk:
              this.handleBrtCellRk(pos, recordSize, handler);
              break;

            case RecordTypes.BrtCellReal:
              this.handleBrtCellReal(pos, recordSize, handler);
              break;

            case RecordTypes.BrtCellSt:
              this.handleBrtCellSt(pos, recordSize, handler);
              break;

            case RecordTypes.BrtCellBool:
              this.handleBrtCellBool(pos, recordSize, handler);
              break;

            case RecordTypes.BrtCellBlank:
              this.handleBrtCellBlank(pos, recordSize, handler);
              break;

            case RecordTypes.BrtCellIsst:
              this.handleBrtCellIsst(pos, recordSize, handler);
              break;
          }

          pos += recordSize;
        } catch (e) {
          if (e instanceof BatchCompleteException) {
            throw e;
          }
          pos += recordSize;
        }
      }

      if (this.currentRow >= 0 && this.currentHandler) {
        this.currentHandler.onRowEnd(this.currentRow);
      }
    } catch (e) {
      if (e instanceof BatchCompleteException) {
        if (this.currentRow >= 0 && this.currentHandler) {
          this.currentHandler.onRowEnd(this.currentRow);
        }
      } else {
        throw e;
      }
    }
  }

  private handleBrtRowHdr(offset: number, size: number, handler: InternalRowHandler): void {
    if (this.currentRow >= 0 && this.currentHandler) {
      this.currentHandler.onRowEnd(this.currentRow);
    }

    if (size < 4) return;
    this.currentRow = readIntLE(this.buffer, offset);
    this.currentHandler = handler;

    let numSpans = 0;
    if (size >= 17) {
      numSpans = readIntLE(this.buffer, offset + 13);
    }

    let lastCol = 0;
    if (numSpans > 0 && size >= 17 + numSpans * 8) {
      const lastSpanOffset = offset + 17 + (numSpans - 1) * 8;
      lastCol = readIntLE(this.buffer, lastSpanOffset + 4);
    }

    const columnCount = Math.max(1, lastCol + 1);
    handler.onRowStart(this.currentRow, columnCount);
  }

  private readStyleIndex(offset: number): number {
    if (offset + 7 > this.buffer.length) return 0;
    return (this.buffer[offset + 4] & 0xFF) |
           ((this.buffer[offset + 5] & 0xFF) << 8) |
           ((this.buffer[offset + 6] & 0xFF) << 16);
  }

  private handleBrtCellRk(offset: number, size: number, handler: InternalRowHandler): void {
    const col = readIntLE(this.buffer, offset);
    const styleIndex = this.readStyleIndex(offset);
    const rkValue = readIntLE(this.buffer, offset + 8);
    const value = this.decodeRk(rkValue);
    handler.onCellNumber(this.currentRow, col, value, styleIndex);
  }

  private handleBrtCellReal(offset: number, size: number, handler: InternalRowHandler): void {
    const col = readIntLE(this.buffer, offset);
    const styleIndex = this.readStyleIndex(offset);
    const value = readDoubleLE(this.buffer, offset + 8);
    handler.onCellNumber(this.currentRow, col, value, styleIndex);
  }

  private handleBrtCellSt(offset: number, size: number, handler: InternalRowHandler): void {
    const col = readIntLE(this.buffer, offset);
    const styleIndex = this.readStyleIndex(offset);
    const sstIndex = readIntLE(this.buffer, offset + 8);
    const value = this.sst.getString(sstIndex);
    handler.onCellText(this.currentRow, col, value, styleIndex);
  }

  private handleBrtCellBool(offset: number, size: number, handler: InternalRowHandler): void {
    const col = readIntLE(this.buffer, offset);
    const styleIndex = this.readStyleIndex(offset);
    const value = this.buffer[offset + 8] !== 0;
    handler.onCellBoolean(this.currentRow, col, value, styleIndex);
  }

  private handleBrtCellBlank(offset: number, size: number, handler: InternalRowHandler): void {
    const col = readIntLE(this.buffer, offset);
    const styleIndex = this.readStyleIndex(offset);
    handler.onCellBlank(this.currentRow, col, styleIndex);
  }

  private handleBrtCellIsst(offset: number, size: number, handler: InternalRowHandler): void {
    if (size < 12) return;

    const col = readIntLE(this.buffer, offset);
    const styleIndex = this.readStyleIndex(offset);
    const sstIndex = readIntLE(this.buffer, offset + 8);

    const value = this.sst.getString(sstIndex);
    handler.onCellText(this.currentRow, col, value || '', styleIndex);
  }

  private decodeRk(rkValue: number): number {
    const isInt = (rkValue & 1) !== 0;
    const div100 = (rkValue & 2) !== 0;

    const valueBits = rkValue & 0xFFFFFFFC;

    let value: number;
    if (isInt) {
      value = valueBits >> 2;
    } else {
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);
      view.setInt32(4, valueBits, true);
      view.setInt32(0, 0, true);
      value = view.getFloat64(0, true);
    }

    if (div100) {
      value = value / 100.0;
    }

    return value;
  }
}
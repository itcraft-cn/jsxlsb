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

export interface CellInfo {
  row: number;
  col: number;
  data: CellData;
  styleIndex: number;
}

export interface MergeCell {
  rowFirst: number;
  rowLast: number;
  colFirst: number;
  colLast: number;
}

export interface MarkerPosition {
  row: number;
  col: number;
}

export class SheetParser {
  private buffer: Uint8Array;
  private sst: SharedStringsTable;
  private cells: CellInfo[] = [];
  private mergeCells: MergeCell[] = [];
  private maxRow: number = -1;
  private maxCol: number = -1;

  constructor(buffer: Uint8Array, sst: SharedStringsTable) {
    this.buffer = buffer;
    this.sst = sst;
  }

  parse(): CellInfo[] {
    let pos = 0;
    let currentRow = -1;

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
            currentRow = readIntLE(this.buffer, pos);
            this.maxRow = Math.max(this.maxRow, currentRow);
            break;

          case RecordTypes.BrtCellIsst:
            this.handleCellIsst(pos, recordSize, currentRow);
            break;

          case RecordTypes.BrtCellSt:
            this.handleCellSt(pos, recordSize, currentRow);
            break;

          case RecordTypes.BrtCellReal:
            this.handleCellReal(pos, recordSize, currentRow);
            break;

          case RecordTypes.BrtCellRk:
            this.handleCellRk(pos, recordSize, currentRow);
            break;

          case RecordTypes.BrtCellBool:
            this.handleCellBool(pos, recordSize, currentRow);
            break;

          case RecordTypes.BrtCellBlank:
            const colBlank = readIntLE(this.buffer, pos);
            this.maxCol = Math.max(this.maxCol, colBlank);
            break;

          case RecordTypes.BrtMergeCell:
            this.handleMergeCell(pos, recordSize);
            break;
        }

        pos += recordSize;
      } catch (e) {
        pos += recordSize;
      }
    }

    return this.cells;
  }

  private handleCellIsst(offset: number, size: number, row: number): void {
    const col = readIntLE(this.buffer, offset);
    const styleIndex = this.readStyleIndex(offset);
    const sstIdx = readIntLE(this.buffer, offset + 8);
    const text = this.sst.getString(sstIdx);
    if (text) {
      this.cells.push({ row, col, data: CellData.text(text), styleIndex });
      this.maxCol = Math.max(this.maxCol, col);
    }
  }

  private handleCellSt(offset: number, size: number, row: number): void {
    const col = readIntLE(this.buffer, offset);
    const styleIndex = this.readStyleIndex(offset);
    const sstIdx = readIntLE(this.buffer, offset + 8);
    const text = this.sst.getString(sstIdx);
    if (text) {
      this.cells.push({ row, col, data: CellData.text(text), styleIndex });
      this.maxCol = Math.max(this.maxCol, col);
    }
  }

  private handleCellReal(offset: number, size: number, row: number): void {
    const col = readIntLE(this.buffer, offset);
    const styleIndex = this.readStyleIndex(offset);
    const value = readDoubleLE(this.buffer, offset + 8);
    this.cells.push({ row, col, data: CellData.number(value), styleIndex });
    this.maxCol = Math.max(this.maxCol, col);
  }

  private handleCellRk(offset: number, size: number, row: number): void {
    const col = readIntLE(this.buffer, offset);
    const styleIndex = this.readStyleIndex(offset);
    const rkValue = readIntLE(this.buffer, offset + 8);
    const value = this.decodeRk(rkValue);
    this.cells.push({ row, col, data: CellData.number(value), styleIndex });
    this.maxCol = Math.max(this.maxCol, col);
  }

  private handleCellBool(offset: number, size: number, row: number): void {
    const col = readIntLE(this.buffer, offset);
    const styleIndex = this.readStyleIndex(offset);
    const value = this.buffer[offset + 8] !== 0;
    this.cells.push({ row, col, data: CellData.bool(value), styleIndex });
    this.maxCol = Math.max(this.maxCol, col);
  }

  private handleMergeCell(offset: number, size: number): void {
    const rowFirst = readIntLE(this.buffer, offset);
    const rowLast = readIntLE(this.buffer, offset + 4);
    const colFirst = readIntLE(this.buffer, offset + 8);
    const colLast = readIntLE(this.buffer, offset + 12);
    this.mergeCells.push({ rowFirst, rowLast, colFirst, colLast });
    this.maxRow = Math.max(this.maxRow, rowLast);
    this.maxCol = Math.max(this.maxCol, colLast);
  }

  private readStyleIndex(offset: number): number {
    if (offset + 7 > this.buffer.length) return 0;
    return (this.buffer[offset + 4] & 0xFF) |
           ((this.buffer[offset + 5] & 0xFF) << 8) |
           ((this.buffer[offset + 6] & 0xFF) << 16);
  }

  private decodeRk(rkValue: number): number {
    const isInt = (rkValue & 0x01) !== 0;
    const div100 = (rkValue & 0x02) !== 0;

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

  getMaxRow(): number {
    return this.maxRow;
  }

  getMaxCol(): number {
    return this.maxCol;
  }

  getCells(): CellInfo[] {
    return this.cells;
  }

  getMergeCells(): MergeCell[] {
    return this.mergeCells;
  }

  findMarker(marker: string): MarkerPosition | null {
    for (const cell of this.cells) {
      if (cell.data.isText()) {
        const text = cell.data.getTextValue();
        if (text === marker) {
          return { row: cell.row, col: cell.col };
        }
      }
    }
    return null;
  }

  findMarkers(markerPattern: RegExp): MarkerPosition[] {
    const positions: MarkerPosition[] = [];
    for (const cell of this.cells) {
      if (cell.data.isText()) {
        const text = cell.data.getTextValue();
        if (text && markerPattern.test(text)) {
          positions.push({ row: cell.row, col: cell.col });
        }
      }
    }
    return positions;
  }

  static toCellData(value: any): CellData {
    if (value === null || value === undefined) {
      return CellData.blank();
    }
    if (typeof value === 'string') {
      return CellData.text(value);
    }
    if (typeof value === 'number') {
      return CellData.number(value);
    }
    if (typeof value === 'boolean') {
      return CellData.bool(value);
    }
    if (value instanceof CellData) {
      return value;
    }
    return CellData.text(String(value));
  }
}
import { RecordTypes } from './RecordTypes';
import {
  readVarInt,
  readVarSize,
  readIntLE,
  readDoubleLE,
  decodeUTF16LE,
  varIntSize,
  varSizeSize
} from './VarInt';

export interface Biff12Record {
  type: number;
  size: number;
  data: Uint8Array;
}

export class Biff12Reader {
  private buffer: Uint8Array;
  private offset: number = 0;

  constructor(buffer: Uint8Array) {
    this.buffer = buffer;
  }

  hasNext(): boolean {
    return this.offset < this.buffer.length - 2;
  }

  nextRecord(): Biff12Record | null {
    if (!this.hasNext()) {
      return null;
    }

    const recordType = readVarInt(this.buffer, this.offset);
    const typeSize = varIntSize(recordType);
    this.offset += typeSize;

    const recordSize = readVarSize(this.buffer, this.offset);
    const sizeBytes = varSizeSize(recordSize);
    this.offset += sizeBytes;

    if (this.offset + recordSize > this.buffer.length) {
      return null;
    }

    const data = this.buffer.slice(this.offset, this.offset + recordSize);
    this.offset += recordSize;

    return { type: recordType, size: recordSize, data };
  }

  readAllRecords(): Biff12Record[] {
    const records: Biff12Record[] = [];
    while (this.hasNext()) {
      const record = this.nextRecord();
      if (record) {
        records.push(record);
      }
    }
    return records;
  }

  getOffset(): number {
    return this.offset;
  }

  setOffset(offset: number): void {
    this.offset = offset;
  }
}

export function parseBrtCellRk(data: Uint8Array): { col: number; value: number; styleIndex: number } {
  const col = readIntLE(data, 0);
  const styleIndex = (data[4] | (data[5] << 8) | (data[6] << 16));
  const rk = readIntLE(data, 8);
  const value = decodeRk(rk);
  return { col, value, styleIndex };
}

export function parseBrtCellReal(data: Uint8Array): { col: number; value: number; styleIndex: number } {
  const col = readIntLE(data, 0);
  const styleIndex = (data[4] | (data[5] << 8) | (data[6] << 16));
  const value = readDoubleLE(data, 8);
  return { col, value, styleIndex };
}

export function parseBrtCellBool(data: Uint8Array): { col: number; value: boolean; styleIndex: number } {
  const col = readIntLE(data, 0);
  const styleIndex = (data[4] | (data[5] << 8) | (data[6] << 16));
  const value = data[8] === 1;
  return { col, value, styleIndex };
}

export function parseBrtCellIsst(data: Uint8Array): { col: number; sstIndex: number; styleIndex: number } {
  const col = readIntLE(data, 0);
  const styleIndex = (data[4] | (data[5] << 8) | (data[6] << 16));
  const sstIndex = readIntLE(data, 8);
  return { col, sstIndex, styleIndex };
}

export function parseBrtCellSt(data: Uint8Array): { col: number; text: string; styleIndex: number } {
  const col = readIntLE(data, 0);
  const styleIndex = (data[4] | (data[5] << 8) | (data[6] << 16));
  const charCount = readIntLE(data, 8);
  const text = decodeUTF16LE(data, 12, charCount);
  return { col, text, styleIndex };
}

export function parseBrtCellBlank(data: Uint8Array): { col: number; styleIndex: number } {
  const col = readIntLE(data, 0);
  const styleIndex = (data[4] | (data[5] << 8) | (data[6] << 16));
  return { col, styleIndex };
}

export function parseBrtRowHdr(data: Uint8Array): { row: number } {
  const row = readIntLE(data, 0);
  return { row };
}

export function parseBrtWsDim(data: Uint8Array): { rowFirst: number; rowLast: number; colFirst: number; colLast: number } {
  const rowFirst = readIntLE(data, 0);
  const rowLast = readIntLE(data, 4);
  const colFirst = readIntLE(data, 8);
  const colLast = readIntLE(data, 12);
  return { rowFirst, rowLast, colFirst, colLast };
}

export function parseBrtSSTItem(data: Uint8Array): string {
  const flags = data[0];
  const charCount = readIntLE(data, 1);
  return decodeUTF16LE(data, 5, charCount);
}

function decodeRk(rk: number): number {
  const isInt = (rk & 2) !== 0;
  const div100 = (rk & 1) !== 0;
  let value: number;

  if (isInt) {
    value = (rk >> 2);
    if (rk & 0x80000000) {
      value = value - 0x20000000;
    }
  } else {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setInt32(4, (rk & 0xFFFFFFFC), true);
    view.setInt32(0, 0, true);
    value = view.getFloat64(0, true);
  }

  if (div100) {
    value = value / 100;
  }

  return value;
}
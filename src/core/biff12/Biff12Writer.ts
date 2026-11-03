import { RecordTypes } from './RecordTypes';
import {
  writeVarInt,
  writeVarSize,
  writeIntLE,
  writeDoubleLE,
  writeXLWideString,
  encodeUTF16LE
} from './VarInt';

export class Biff12Writer {
  private buffer: number[] = [];

  writeRecordHeader(recordType: number, recordSize: number): void {
    this.buffer.push(...writeVarInt(recordType));
    this.buffer.push(...writeVarSize(recordSize));
  }

  writeEmptyRecord(recordType: number): void {
    this.writeRecordHeader(recordType, 0);
  }

  writeIntLE(value: number): void {
    this.buffer.push(...writeIntLE(value));
  }

  writeDoubleLE(value: number): void {
    this.buffer.push(...writeDoubleLE(value));
  }

  writeBytes(bytes: number[] | Uint8Array): void {
    if (Array.isArray(bytes)) {
      this.buffer.push(...bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) {
        this.buffer.push(bytes[i]);
      }
    }
  }

  writeXLWideString(str: string): void {
    this.buffer.push(...writeXLWideString(str));
  }

  /** 在指定偏移回填一个小端 u32（用于事后修补维度等字段）。 */
  setUint32At(offset: number, value: number): void {
    const bytes = writeIntLE(value);
    for (let i = 0; i < 4; i++) {
      this.buffer[offset + i] = bytes[i];
    }
  }

  writeCell(column: number, styleIndex: number = 0): void {
    this.writeIntLE(column);
    this.buffer.push(styleIndex & 0xFF);
    this.buffer.push((styleIndex >> 8) & 0xFF);
    this.buffer.push((styleIndex >> 16) & 0xFF);
    this.buffer.push(0);
  }

  writeBrtRowHdr(row: number, columnCount: number): void {
    const spans = Math.ceil(columnCount / 16);
    const spanValue = spans << 16 | spans;
    const recordSize = 16;
    this.writeRecordHeader(RecordTypes.BrtRowHdr, recordSize);
    this.writeIntLE(row);
    this.writeIntLE(spanValue);
    this.writeIntLE(0);
    this.writeIntLE(0);
    this.writeIntLE(0);
    this.writeIntLE(0);
  }

  /** 写入单元格 8 字节头：column(4) + style(3) + flags(1)。 */
  writeCellHeader(buffer: number[], offset: number, column: number, styleIndex: number): void {
    buffer[offset] = column & 0xFF;
    buffer[offset + 1] = (column >>> 8) & 0xFF;
    buffer[offset + 2] = (column >>> 16) & 0xFF;
    buffer[offset + 3] = (column >>> 24) & 0xFF;
    buffer[offset + 4] = styleIndex & 0xFF;
    buffer[offset + 5] = (styleIndex >>> 8) & 0xFF;
    buffer[offset + 6] = (styleIndex >>> 16) & 0xFF;
    buffer[offset + 7] = 0;
  }

  writeBrtCellBlank(row: number, col: number, styleIndex: number = 0): void {
    this.writeRecordHeader(RecordTypes.BrtCellBlank, 8);
    this.writeCell(col, styleIndex);
  }

  writeBrtCellRk(row: number, col: number, value: number, styleIndex: number = 0): void {
    this.writeRecordHeader(RecordTypes.BrtCellRk, 12);
    this.writeCell(col, styleIndex);
    this.writeIntLE(this.encodeRk(value));
  }

  writeBrtCellReal(row: number, col: number, value: number, styleIndex: number = 0): void {
    this.writeRecordHeader(RecordTypes.BrtCellReal, 16);
    this.writeCell(col, styleIndex);
    this.writeDoubleLE(value);
  }

  writeBrtCellBool(row: number, col: number, value: boolean, styleIndex: number = 0): void {
    this.writeRecordHeader(RecordTypes.BrtCellBool, 9);
    this.writeCell(col, styleIndex);
    this.buffer.push(value ? 1 : 0);
  }

  writeBrtCellIsst(row: number, col: number, sstIndex: number, styleIndex: number = 0): void {
    this.writeRecordHeader(RecordTypes.BrtCellIsst, 12);
    this.writeCell(col, styleIndex);
    this.writeIntLE(sstIndex);
  }

  writeBrtCellSt(row: number, col: number, text: string, styleIndex: number = 0): void {
    const utf16le = encodeUTF16LE(text);
    const recordSize = 8 + 4 + utf16le.length;
    this.writeRecordHeader(RecordTypes.BrtCellSt, recordSize);
    this.writeCell(col, styleIndex);
    this.writeIntLE(text.length);
    this.writeBytes(utf16le);
  }

  writeBrtWsDim(rowFirst: number, rowLast: number, colFirst: number, colLast: number): void {
    this.writeRecordHeader(RecordTypes.BrtWsDim, 16);
    this.writeIntLE(rowFirst);
    this.writeIntLE(rowLast);
    this.writeIntLE(colFirst);
    this.writeIntLE(colLast);
  }

  writeBrtBeginSheet(): void {
    this.writeEmptyRecord(RecordTypes.BrtBeginSheet);
  }

  writeBrtEndSheet(): void {
    this.writeEmptyRecord(RecordTypes.BrtEndSheet);
  }

  writeBrtBeginSheetData(): void {
    this.writeEmptyRecord(RecordTypes.BrtBeginSheetData);
  }

  writeBrtEndSheetData(): void {
    this.writeEmptyRecord(RecordTypes.BrtEndSheetData);
  }

  private encodeRk(value: number): number {
    // 标准 RK 整数形式：num(30 位有符号)<<2 | fInt(bit1)=1
    return (((value << 2) | 0x02) >>> 0);
  }

  toUint8Array(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  toArray(): number[] {
    return this.buffer;
  }

  size(): number {
    return this.buffer.length;
  }

  reset(): void {
    this.buffer = [];
  }
}
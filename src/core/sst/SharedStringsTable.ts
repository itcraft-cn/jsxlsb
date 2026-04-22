import { RecordTypes } from '../biff12/RecordTypes';
import { Biff12Writer } from '../biff12/Biff12Writer';
import {
  readVarInt,
  readVarSize,
  readIntLE,
  varIntSize,
  varSizeSize,
  decodeUTF16LE
} from '../biff12/VarInt';

export class SharedStringsTable {
  private strings: string[] = [];
  private indexMap: Map<string, number> = new Map();
  private totalCount: number = 0;

  addString(str: string): number {
    this.totalCount++;

    if (this.indexMap.has(str)) {
      return this.indexMap.get(str)!;
    }

    const newIndex = this.strings.length;
    this.strings.push(str);
    this.indexMap.set(str, newIndex);
    return newIndex;
  }

  getString(index: number): string {
    return this.strings[index] || '';
  }

  getCount(): number {
    return this.strings.length;
  }

  getTotalCount(): number {
    return this.totalCount;
  }

  size(): number {
    return this.strings.length;
  }

  clear(): void {
    this.strings = [];
    this.indexMap.clear();
    this.totalCount = 0;
  }

  toBiff12Bytes(): Uint8Array {
    const writer = new Biff12Writer();

    writer.writeRecordHeader(RecordTypes.BrtBeginSst, 8);
    writer.writeIntLE(this.totalCount);
    writer.writeIntLE(this.strings.length);

    for (const str of this.strings) {
      this.writeSSTItem(writer, str);
    }

    writer.writeEmptyRecord(RecordTypes.BrtEndSst);

    return writer.toUint8Array();
  }

  private writeSSTItem(writer: Biff12Writer, str: string): void {
    const utf16leBytes: number[] = [];
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      utf16leBytes.push(code & 0xFF, (code >> 8) & 0xFF);
    }

    const recordSize = 1 + 4 + utf16leBytes.length;
    writer.writeRecordHeader(RecordTypes.BrtSSTItem, recordSize);
    writer.writeBytes([0]);
    writer.writeIntLE(str.length);
    writer.writeBytes(utf16leBytes);
  }

  load(buffer: Uint8Array): void {
    let offset = 0;

    while (offset < buffer.length - 2) {
      const recordType = readVarInt(buffer, offset);
      const typeSize = varIntSize(recordType);
      offset += typeSize;

      const recordSize = readVarSize(buffer, offset);
      const sizeBytes = varSizeSize(recordSize);
      offset += sizeBytes;

      if (offset + recordSize > buffer.length) {
        break;
      }

      if (recordType === RecordTypes.BrtSSTItem) {
        const data = buffer.slice(offset, offset + recordSize);
        const text = this.parseSSTItem(data);
        this.strings.push(text);
      }

      offset += recordSize;
    }
  }

  private parseSSTItem(data: Uint8Array): string {
    const flags = data[0];
    const charCount = readIntLE(data, 1);
    return decodeUTF16LE(data, 5, charCount);
  }
}
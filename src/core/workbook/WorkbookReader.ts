import { RecordTypes } from '../biff12/RecordTypes';
import {
  readVarInt,
  readVarSize,
  readIntLE,
  varIntSize,
  varSizeSize,
  decodeUTF16LE
} from '../biff12/VarInt';
import { SheetInfo } from '../../api/interfaces';

export class WorkbookReader {
  private buffer: Uint8Array;

  constructor(buffer: Uint8Array) {
    this.buffer = buffer;
  }

  parseSheetList(): SheetInfo[] {
    const sheets: SheetInfo[] = [];
    let pos = 0;

    while (pos + 2 <= this.buffer.length) {
      const recordType = readVarInt(this.buffer, pos);
      const typeSize = varIntSize(recordType);
      pos += typeSize;

      if (pos >= this.buffer.length) break;

      const recordSize = readVarSize(this.buffer, pos);
      const sizeBytes = varSizeSize(recordSize);
      pos += sizeBytes;

      if (recordSize > 0 && pos + recordSize > this.buffer.length) {
        break;
      }

      if (recordType === RecordTypes.BrtBundleSh) {
        const info = this.parseBrtBundleSh(pos, recordSize);
        if (info) {
          sheets.push(info);
        }
      }

      pos += recordSize;
    }

    return sheets;
  }

  private parseBrtBundleSh(offset: number, size: number): SheetInfo | null {
    let pos = offset;
    pos += 4;

    const iTabId = readIntLE(this.buffer, pos);
    pos += 4;

    const relId = this.readXLWideString(pos);
    pos += 4 + relId.length * 2;

    const name = this.readXLWideString(pos);

    return { name, index: iTabId - 1, path: '' };
  }

  private readXLWideString(offset: number): string {
    const length = readIntLE(this.buffer, offset);
    if (length === 0) return '';

    return decodeUTF16LE(this.buffer, offset + 4, length);
  }
}
import { RecordTypes } from '../biff12/RecordTypes';
import {
  readVarInt,
  readVarSize,
  readIntLE,
  varIntSize,
  varSizeSize,
  decodeUTF16LE
} from '../biff12/VarInt';

export class StylesReader {
  private formats: Map<number, string> = new Map();
  private xfFormatIds: number[] = [];
  private styleFormatIds: number[] = [];

  load(buffer: Uint8Array): void {
    let pos = 0;

    while (pos + 2 <= buffer.length) {
      const recordType = readVarInt(buffer, pos);
      const typeSize = varIntSize(recordType);
      pos += typeSize;

      if (pos >= buffer.length) break;

      const recordSize = readVarSize(buffer, pos);
      const sizeBytes = varSizeSize(recordSize);
      pos += sizeBytes;

      if (recordSize < 0 || recordSize > buffer.length) {
        pos += Math.max(0, recordSize);
        continue;
      }

      if (recordSize > 0 && pos + recordSize > buffer.length) {
        break;
      }

      switch (recordType) {
        case RecordTypes.BrtFmt:
          this.handleBrtFmt(buffer, pos, recordSize);
          break;

        case RecordTypes.BrtXF:
          this.handleBrtXF(buffer, pos, recordSize);
          break;
      }

      pos += recordSize;
    }
  }

  private handleBrtFmt(buffer: Uint8Array, offset: number, size: number): void {
    if (size < 6) return;

    const formatId = buffer[offset] | (buffer[offset + 1] << 8);
    const strLen = readIntLE(buffer, offset + 2);

    if (strLen > 0 && offset + 6 + strLen * 2 <= buffer.length) {
      const formatCode = decodeUTF16LE(buffer, offset + 6, strLen);
      this.formats.set(formatId, formatCode);
    }
  }

  private handleBrtXF(buffer: Uint8Array, offset: number, size: number): void {
    if (size < 16) return;

    const numFmtId = buffer[offset + 2] | (buffer[offset + 3] << 8);

    if (this.xfFormatIds.length === 0) {
      this.xfFormatIds.push(numFmtId);
    } else {
      this.styleFormatIds.push(numFmtId);
    }
  }

  getFormatCode(styleIndex: number): string | undefined {
    if (styleIndex < 0) return undefined;

    if (styleIndex < this.styleFormatIds.length) {
      const formatId = this.styleFormatIds[styleIndex];
      return this.formats.get(formatId) || this.getBuiltinFormat(formatId);
    }

    return undefined;
  }

  private getBuiltinFormat(formatId: number): string | undefined {
    const builtinFormats: Record<number, string> = {
      0: 'General',
      1: '0',
      2: '0.00',
      3: '#,##0',
      4: '#,##0.00',
      5: '$#,##0_);($#,##0)',
      6: '$#,##0_);[Red]($#,##0)',
      7: '$#,##0.00_);($#,##0.00)',
      8: '$#,##0.00_);[Red]($#,##0.00)',
      9: '0%',
      10: '0.00%',
      11: '0.00E+00',
      12: '# ?/?',
      13: '# ??/??',
      14: 'mm-dd-yy',
      15: 'd-mmm-yy',
      16: 'd-mmm',
      17: 'mmm-yy',
      18: 'h:mm AM/PM',
      19: 'h:mm:ss AM/PM',
      20: 'h:mm',
      21: 'h:mm:ss',
      22: 'm/d/yy h:mm',
      37: '#,##0_);(#,##0)',
      38: '#,##0_);[Red](#,##0)',
      39: '#,##0.00_);(#,##0.00)',
      40: '#,##0.00_);[Red](#,##0.00)',
      41: '_(*#,##0_);_(*(#,##0);_(* "-"_);_(@_)',
      42: '_($*#,##0_);_($* (#,##0);_($* "-"_);_(@_)',
      43: '_(*#,##0.00_);_(*(#,##0.00);_(* "-"??_);_(@_)',
      44: '_($*#,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)',
      45: 'mm:ss',
      46: '[h]:mm:ss',
      47: 'mmss.0',
      48: '##0.0E+0',
      49: '@',
    };

    return builtinFormats[formatId];
  }

  getFormats(): Map<number, string> {
    return this.formats;
  }

  getStyleCount(): number {
    return this.styleFormatIds.length;
  }
}
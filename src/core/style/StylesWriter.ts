import { Biff12Writer } from '../biff12/Biff12Writer';
import { RecordTypes } from '../biff12/RecordTypes';

export class StylesWriter {
  private dateFormats: string[] = [];
  private formatRegistry: Map<string, number> = new Map();
  private nextFormatId: number = 164;

  addDateFormat(formatCode: string): number {
    if (this.formatRegistry.has(formatCode)) {
      return this.formatRegistry.get(formatCode)!;
    }
    const styleId = this.dateFormats.length + 1;
    const formatId = this.nextFormatId++;
    this.formatRegistry.set(formatCode, formatId);
    this.dateFormats.push(formatCode);
    return styleId;
  }

  toBiff12Bytes(): Uint8Array {
    const w = new Biff12Writer();

    w.writeEmptyRecord(RecordTypes.BrtBeginCellStyleXFs);

    this.writeFormats(w);
    this.writeFonts(w);
    this.writeFills(w);
    this.writeBorders(w);

    this.writeCellStyleXFs2(w);

    this.writeStyles(w);

    w.writeEmptyRecord(RecordTypes.BrtEndCellStyleXFs);

    return w.toUint8Array();
  }

  private writeFormats(w: Biff12Writer): void {
    w.writeRecordHeader(RecordTypes.BrtBeginFmts, 4);
    w.writeIntLE(this.dateFormats.length);

    for (let i = 0; i < this.dateFormats.length; i++) {
      const formatCode = this.dateFormats[i];
      const formatId = this.formatRegistry.get(formatCode) || 164 + i;
      this.writeBrtFmt(w, formatId, formatCode);
    }

    w.writeEmptyRecord(RecordTypes.BrtEndFmts);
  }

  private writeBrtFmt(w: Biff12Writer, formatId: number, formatString: string): void {
    const strLen = formatString.length;
    const recordSize = 2 + 4 + strLen * 2;

    w.writeRecordHeader(RecordTypes.BrtFmt, recordSize);
    w.writeBytes([formatId & 0xFF, (formatId >> 8) & 0xFF]);
    w.writeIntLE(strLen);

    for (let i = 0; i < strLen; i++) {
      const code = formatString.charCodeAt(i);
      w.writeBytes([code & 0xFF, (code >> 8) & 0xFF]);
    }
  }

  private writeFonts(w: Biff12Writer): void {
    w.writeRecordHeader(RecordTypes.BrtBeginFonts, 4);
    w.writeIntLE(1);

    this.writeBrtFont(w);

    w.writeEmptyRecord(RecordTypes.BrtEndFonts);
  }

  private writeBrtFont(w: Biff12Writer): void {
    const data = [
      0xDC, 0x00, 0x00, 0x00,
      0x90, 0x01, 0x00, 0x00,
      0x00, 0x00,
      0x86, 0x00,
      0x07, 0x01,
      0x00, 0x00, 0x00, 0x00, 0x00,
      0xFF,
      0x02, 0x02, 0x00, 0x00, 0x00,
      0x8B, 0x5B, 0x53, 0x4F
    ];
    w.writeRecordHeader(RecordTypes.BrtFont, data.length);
    w.writeBytes(data);
  }

  private writeFills(w: Biff12Writer): void {
    w.writeRecordHeader(RecordTypes.BrtBeginFills, 4);
    w.writeIntLE(2);

    this.writeBrtFill(w, [0x00, 0x00, 0x00, 0x00]);
    this.writeBrtFill(w, [0x02, 0x00, 0x80, 0x00]);

    w.writeEmptyRecord(RecordTypes.BrtEndFills);
  }

  private writeBrtFill(w: Biff12Writer, data: number[]): void {
    w.writeRecordHeader(RecordTypes.BrtFill, data.length);
    w.writeBytes(data);
  }

  private writeBorders(w: Biff12Writer): void {
    w.writeRecordHeader(RecordTypes.BrtBeginBorders, 4);
    w.writeIntLE(1);

    const data: number[] = [];
    for (let i = 0; i < 24; i++) data.push(0);
    w.writeRecordHeader(RecordTypes.BrtBorder, 24);
    w.writeBytes(data);

    w.writeEmptyRecord(RecordTypes.BrtEndBorders);
  }

  private writeCellStyleXFs2(w: Biff12Writer): void {
    w.writeRecordHeader(RecordTypes.BrtBeginXFs, 4);
    w.writeIntLE(1);

    const data = [
      0xFF, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x08, 0x10, 0x00, 0x00
    ];
    w.writeRecordHeader(RecordTypes.BrtXF, 16);
    w.writeBytes(data);

    w.writeEmptyRecord(RecordTypes.BrtEndXFs);
  }

  private writeStyles(w: Biff12Writer): void {
    const count = 1 + this.dateFormats.length;

    w.writeRecordHeader(RecordTypes.BrtBeginStyles, 4);
    w.writeIntLE(count);

    this.writeStyleXF(w, 0, true);

    for (let i = 0; i < this.dateFormats.length; i++) {
      const formatCode = this.dateFormats[i];
      const formatId = this.formatRegistry.get(formatCode) || 164 + i;
      this.writeStyleXF(w, formatId, false);
    }

    w.writeEmptyRecord(RecordTypes.BrtEndStyles);
  }

  private writeStyleXF(w: Biff12Writer, formatId: number, isFirst: boolean): void {
    const data: number[] = [
      0x00, 0x00,
      formatId & 0xFF, (formatId >> 8) & 0xFF,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x08, 0x10, isFirst ? 0x00 : 0x01, 0x00
    ];
    w.writeRecordHeader(RecordTypes.BrtXF, 16);
    w.writeBytes(data);
  }
}
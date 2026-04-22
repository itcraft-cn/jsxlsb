import { Biff12Writer } from '../biff12/Biff12Writer';
import { RecordTypes } from '../biff12/RecordTypes';

interface InternalSheetInfo {
  name: string;
  sheetId: number;
}

export class WorkbookWriter {
  private sheets: InternalSheetInfo[] = [];

  addSheet(name: string): void {
    this.sheets.push({ name, sheetId: this.sheets.length + 1 });
  }

  getSheetCount(): number {
    return this.sheets.length;
  }

  toBiff12Bytes(): Uint8Array {
    const w = new Biff12Writer();

    w.writeEmptyRecord(RecordTypes.BrtBeginBook);

    this.writeBrtFileVersion(w);

    this.writeBrtWbProp(w);

    w.writeEmptyRecord(RecordTypes.BrtBeginBookViews);

    this.writeBrtBookView(w);

    w.writeEmptyRecord(RecordTypes.BrtEndBookViews);

    w.writeEmptyRecord(RecordTypes.BrtBeginBundleShs);

    for (const sheet of this.sheets) {
      this.writeBrtBundleSh(w, sheet);
    }

    w.writeEmptyRecord(RecordTypes.BrtEndBundleShs);

    w.writeEmptyRecord(RecordTypes.BrtEndBook);

    return w.toUint8Array();
  }

  private writeBrtFileVersion(w: Biff12Writer): void {
    const data = [
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00,
      0x00, 0x00, 0x78, 0x00, 0x6C, 0x00, 0x01, 0x00,
      0x00, 0x00, 0x33, 0x00, 0x01, 0x00, 0x00, 0x00,
      0x35, 0x00, 0x04, 0x00, 0x00, 0x00, 0x39, 0x00,
      0x33, 0x00, 0x30, 0x00, 0x32, 0x00, 0x00
    ];
    w.writeRecordHeader(RecordTypes.BrtFileVersion, data.length);
    w.writeBytes(data);
  }

  private writeBrtWbProp(w: Biff12Writer): void {
    const data = [
      0x20, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00
    ];
    w.writeRecordHeader(RecordTypes.BrtWbProp, data.length);
    w.writeBytes(data);
  }

  private writeBrtBookView(w: Biff12Writer): void {
    const data = [
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x80, 0x70, 0x00, 0x00, 0xCF, 0x30, 0x00, 0x00,
      0x58, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x78
    ];
    w.writeRecordHeader(RecordTypes.BrtBookView, data.length);
    w.writeBytes(data);
  }

  private writeBrtBundleSh(w: Biff12Writer, sheet: InternalSheetInfo): void {
    const relId = 'rId' + sheet.sheetId;
    const recordSize = 4 + 4 + (4 + relId.length * 2) + (4 + sheet.name.length * 2);

    w.writeRecordHeader(RecordTypes.BrtBundleSh, recordSize);

    w.writeIntLE(0);
    w.writeIntLE(1);

    w.writeXLWideString(relId);
    w.writeXLWideString(sheet.name);
  }
}
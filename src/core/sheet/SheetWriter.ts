import { CellData } from '../cell/CellData';
import { CellType } from '../cell/CellType';
import { SharedStringsTable } from '../sst/SharedStringsTable';
import { Biff12Writer } from '../biff12/Biff12Writer';
import { RecordTypes } from '../biff12/RecordTypes';
import { timestampToExcelDate } from '../../utils/DateUtils';

const MIN_RK_INTEGER = -536870912;
const MAX_RK_INTEGER = 536870911;

export interface CellDataSupplier {
  get(row: number, col: number): CellData | null;
}

export class SheetWriter {
  private sst: SharedStringsTable;
  private stylesWriter: any = null;
  private defaultDateStyleId: number = 0;
  private streamingWriter: Biff12Writer | null = null;
  private streamingColumnCount: number = 0;

  constructor(sst: SharedStringsTable, stylesWriter?: any) {
    this.sst = sst;
    if (stylesWriter) {
      this.stylesWriter = stylesWriter;
      this.defaultDateStyleId = 0;
    }
  }

  writeSheet(supplier: CellDataSupplier, rowCount: number, columnCount: number): Uint8Array {
    const estimatedSize = rowCount * columnCount * 30 + 1024;
    const w = new Biff12Writer();

    this.writeSheetHeader(w, rowCount, columnCount);

    w.writeEmptyRecord(RecordTypes.BrtBeginSheetData);

    for (let row = 0; row < rowCount; row++) {
      this.writeBrtRowHdr(w, row, columnCount);

      for (let col = 0; col < columnCount; col++) {
        const data = supplier.get(row, col);
        if (data && data.type) {
          this.writeCell(w, row, col, data);
        }
      }
    }

    this.writeSheetFooter(w);

    return w.toUint8Array();
  }

  startStreaming(columnCount: number): void {
    this.streamingWriter = new Biff12Writer();
    this.streamingColumnCount = columnCount;

    this.writeSheetHeader(this.streamingWriter, 0, columnCount);
    this.streamingWriter.writeEmptyRecord(RecordTypes.BrtBeginSheetData);
  }

  appendRows(supplier: CellDataSupplier, startRow: number, batchSize: number, columnCount: number): void {
    if (!this.streamingWriter) {
      throw new Error('Streaming not started, call startStreaming() first');
    }

    for (let row = startRow; row < startRow + batchSize; row++) {
      this.writeBrtRowHdr(this.streamingWriter, row, columnCount);

      for (let col = 0; col < columnCount; col++) {
        const data = supplier.get(row, col);
        if (data && data.type) {
          this.writeCell(this.streamingWriter, row, col, data);
        }
      }
    }
  }

  finalizeStreaming(totalRows: number, columnCount: number): Uint8Array {
    if (!this.streamingWriter) {
      throw new Error('Streaming not started');
    }

    this.writeSheetFooter(this.streamingWriter);

    const result = this.streamingWriter.toUint8Array();
    this.streamingWriter = null;
    this.streamingColumnCount = 0;

    return result;
  }

  private writeSheetHeader(w: Biff12Writer, rowCount: number, columnCount: number): void {
    w.writeEmptyRecord(RecordTypes.BrtBeginSheet);

    this.writeBrtWsProp(w);

    if (rowCount > 0 && columnCount > 0) {
      w.writeRecordHeader(RecordTypes.BrtWsDim, 16);
      w.writeIntLE(0);
      w.writeIntLE(rowCount - 1);
      w.writeIntLE(0);
      w.writeIntLE(columnCount - 1);
    } else {
      w.writeRecordHeader(RecordTypes.BrtWsDim, 16);
      w.writeIntLE(0);
      w.writeIntLE(0);
      w.writeIntLE(0);
      w.writeIntLE(0);
    }

    this.writeViewRecords(w);
  }

  private writeSheetFooter(w: Biff12Writer): void {
    w.writeEmptyRecord(RecordTypes.BrtEndSheetData);

    this.writePageSetupRecords(w);

    w.writeEmptyRecord(RecordTypes.BrtEndSheet);
  }

  private writeBrtRowHdr(w: Biff12Writer, row: number, colCount: number): void {
    const numSpans = colCount > 0 ? Math.ceil(colCount / 1024) : 0;
    const recordSize = 4 + 4 + 2 + 3 + 4 + (numSpans * 8);

    w.writeRecordHeader(RecordTypes.BrtRowHdr, recordSize);
    w.writeIntLE(row);
    w.writeIntLE(0);
    w.writeBytes([0x0E, 0x01]);
    w.writeBytes([0x00, 0x00, 0x00]);
    w.writeIntLE(numSpans);

    for (let seg = 0; seg < numSpans; seg++) {
      const segStartCol = seg * 1024;
      const segEndCol = Math.min((seg + 1) * 1024 - 1, colCount - 1);
      w.writeIntLE(segStartCol);
      w.writeIntLE(segEndCol);
    }
  }

  private writeCell(w: Biff12Writer, row: number, col: number, data: CellData, styleIndex: number = -1): void {
    const actualStyleIndex = styleIndex >= 0 ? styleIndex : this.getStyleIdForFormat(data);
    
    switch (data.type) {
      case CellType.NUMBER:
        const num = data.value as number;
        if (num === Math.floor(num) && num >= MIN_RK_INTEGER && num <= MAX_RK_INTEGER) {
          this.writeBrtCellRk(w, col, num, actualStyleIndex);
        } else {
          this.writeBrtCellReal(w, col, num, actualStyleIndex);
        }
        break;

      case CellType.TEXT:
        const sstIdx = this.sst.addString(data.value as string);
        this.writeBrtCellIsst(w, col, sstIdx, actualStyleIndex);
        break;

      case CellType.DATE:
        const timestamp = data.value as number;
        const excelDate = timestampToExcelDate(timestamp);
        const dateStyleIndex = styleIndex >= 0 ? styleIndex : this.getDateStyleIdForFormat(data);
        this.writeBrtCellReal(w, col, excelDate, dateStyleIndex);
        break;

      case CellType.BOOLEAN:
        this.writeBrtCellBool(w, col, data.value as boolean, actualStyleIndex);
        break;

      case CellType.BLANK:
        this.writeBrtCellBlank(w, col, actualStyleIndex);
        break;

      default:
        throw new Error('Unknown cell type: ' + data.type);
    }
  }

  private getStyleIdForFormat(data: CellData): number {
    if (!data.hasFormatCode()) {
      return 0;
    }
    if (!this.stylesWriter) {
      return 0;
    }
    return this.stylesWriter.addDateFormat(data.formatCode!);
  }

  private getDateStyleIdForFormat(data: CellData): number {
    if (!data.hasFormatCode()) {
      return this.defaultDateStyleId;
    }
    if (!this.stylesWriter) {
      return this.defaultDateStyleId;
    }
    return this.stylesWriter.addDateFormat(data.formatCode!);
  }

  private writeBrtCellRk(w: Biff12Writer, col: number, value: number, styleIndex: number): void {
    w.writeRecordHeader(RecordTypes.BrtCellRk, 12);
    w.writeCell(col, styleIndex);
    w.writeIntLE(this.encodeRk(value));
  }

  private writeBrtCellReal(w: Biff12Writer, col: number, value: number, styleIndex: number): void {
    w.writeRecordHeader(RecordTypes.BrtCellReal, 16);
    w.writeCell(col, styleIndex);
    w.writeDoubleLE(value);
  }

  private writeBrtCellBool(w: Biff12Writer, col: number, value: boolean, styleIndex: number): void {
    w.writeRecordHeader(RecordTypes.BrtCellBool, 9);
    w.writeCell(col, styleIndex);
    w.writeBytes([value ? 1 : 0]);
  }

  private writeBrtCellIsst(w: Biff12Writer, col: number, sstIndex: number, styleIndex: number): void {
    w.writeRecordHeader(RecordTypes.BrtCellIsst, 12);
    w.writeCell(col, styleIndex);
    w.writeIntLE(sstIndex);
  }

  private writeBrtCellBlank(w: Biff12Writer, col: number, styleIndex: number): void {
    w.writeRecordHeader(RecordTypes.BrtCellBlank, 8);
    w.writeCell(col, styleIndex);
  }

  private encodeRk(value: number): number {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setFloat64(0, value, true);
    const high = view.getInt32(4, true);
    return high;
  }

  private writeBrtWsProp(w: Biff12Writer): void {
    const data = [
      0xC9, 0x04, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x00
    ];
    w.writeRecordHeader(RecordTypes.BrtWsProp, data.length);
    w.writeBytes(data);
  }

  private writeViewRecords(w: Biff12Writer): void {
    w.writeEmptyRecord(RecordTypes.BrtBeginWsViews);

    const wsViewData = [
      0xDC, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x40, 0x00, 0x00, 0x00, 0x64, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ];
    w.writeRecordHeader(RecordTypes.BrtBeginWsView, wsViewData.length);
    w.writeBytes(wsViewData);

    const selData = [
      0x03, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00,
      0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00,
      0x06, 0x00, 0x00, 0x00, 0x07, 0x00, 0x00, 0x00,
      0x07, 0x00, 0x00, 0x00
    ];
    w.writeRecordHeader(RecordTypes.BrtSel, selData.length);
    w.writeBytes(selData);

    w.writeEmptyRecord(RecordTypes.BrtEndWsView);
    w.writeEmptyRecord(RecordTypes.BrtEndWsViews);

    const fmtInfoData = [
      0x00, 0x09, 0x00, 0x00, 0x08, 0x00, 0x0E, 0x01,
      0x00, 0x00, 0x00, 0x00
    ];
    w.writeRecordHeader(RecordTypes.BrtWsFmtInfo, fmtInfoData.length);
    w.writeBytes(fmtInfoData);
  }

  private writePageSetupRecords(w: Biff12Writer): void {
    const drawingData = [
      0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00,
      0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x01, 0x00, 0x00, 0x00
    ];
    w.writeRecordHeader(RecordTypes.BrtDrawing, drawingData.length);
    w.writeBytes(drawingData);

    const psViewData = [0x10, 0x00];
    w.writeRecordHeader(RecordTypes.BrtPageSetupView, psViewData.length);
    w.writeBytes(psViewData);

    const psData = [
      0x00, 0x00, 0x00, 0x00, 0x00, 0xE8, 0x3F, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0xE8, 0x3F, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0xF0, 0x3F, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0xF0, 0x3F, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0xE0, 0x3F, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0xE0, 0x3F
    ];
    w.writeRecordHeader(RecordTypes.BrtPageSetup, psData.length);
    w.writeBytes(psData);
  }

  getStreamingColumnCount(): number {
    return this.streamingColumnCount;
  }
}
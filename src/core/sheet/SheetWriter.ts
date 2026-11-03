import { CellData } from '../cell/CellData';
import { CellType } from '../cell/CellType';
import { SharedStringsTable } from '../sst/SharedStringsTable';
import { Biff12Writer } from '../biff12/Biff12Writer';
import { RecordTypes } from '../biff12/RecordTypes';
import { timestampToExcelDate } from '../../utils/DateUtils';
import { CellInfo, MergeCell } from '../template/SheetParser';
import { SheetLimits } from '../limits';

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
  private streamingDimLastRowOffset: number = 0;
  private streamingLimits: SheetLimits | null = null;

  constructor(sst: SharedStringsTable, stylesWriter?: any) {
    this.sst = sst;
    if (stylesWriter) {
      this.stylesWriter = stylesWriter;
      this.defaultDateStyleId = 0;
    }
  }

  writeSheet(supplier: CellDataSupplier, rowCount: number, columnCount: number): Uint8Array {
    const limits = SheetLimits.begin(columnCount);
    columnCount = limits.columns();
    rowCount = limits.rows(0, rowCount);

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
    const limits = SheetLimits.begin(columnCount);
    columnCount = limits.columns();

    this.streamingWriter = new Biff12Writer();
    this.streamingColumnCount = columnCount;
    this.streamingLimits = limits;

    // 前导先写维度（last_row 先置 0），结束时按偏移回填。
    this.streamingDimLastRowOffset = this.writeSheetHeader(this.streamingWriter, 0, columnCount);
    this.streamingWriter.writeEmptyRecord(RecordTypes.BrtBeginSheetData);
  }

  appendRows(supplier: CellDataSupplier, startRow: number, batchSize: number, columnCount: number): void {
    if (!this.streamingWriter || !this.streamingLimits) {
      throw new Error('Streaming not started, call startStreaming() first');
    }

    const rows = this.streamingLimits.rows(startRow, batchSize);
    const cols = this.streamingColumnCount;

    for (let row = startRow; row < startRow + rows; row++) {
      this.writeBrtRowHdr(this.streamingWriter, row, cols);

      for (let col = 0; col < cols; col++) {
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

    const lastRow = totalRows > 0 ? totalRows - 1 : 0;
    this.streamingWriter.setUint32At(this.streamingDimLastRowOffset, lastRow);

    this.writeSheetFooter(this.streamingWriter);

    const result = this.streamingWriter.toUint8Array();
    this.streamingWriter = null;
    this.streamingColumnCount = 0;
    this.streamingLimits = null;

    return result;
  }

  /** 写入 sheet 前导，返回 BrtWsDim 中 last_row 字段的字节偏移（用于回填）。 */
  private writeSheetHeader(w: Biff12Writer, rowCount: number, columnCount: number): number {
    w.writeEmptyRecord(RecordTypes.BrtBeginSheet);

    this.writeBrtWsProp(w);

    const dimOffset = w.size();
    const lastRow = rowCount > 0 ? rowCount - 1 : 0;
    const lastCol = columnCount > 0 ? columnCount - 1 : 0;
    w.writeRecordHeader(RecordTypes.BrtWsDim, 16);
    w.writeIntLE(0);
    w.writeIntLE(lastRow);
    w.writeIntLE(0);
    w.writeIntLE(lastCol);

    this.writeViewRecords(w);

    // type varint(2) + varsize(1) + first_row(4)
    return dimOffset + 2 + 1 + 4;
  }

  private writeSheetFooter(w: Biff12Writer): void {
    w.writeEmptyRecord(RecordTypes.BrtEndSheetData);

    this.writePageSetupRecords(w);

    w.writeEmptyRecord(RecordTypes.BrtEndSheet);
  }

  private writeBrtRowHdr(w: Biff12Writer, row: number, colCount: number): void {
    const numSpans = colCount > 0 ? Math.ceil(colCount / 1024) : 0;

    // 常见路径：单 span（列数 <= 1024），固定 27 字节整块写出。
    if (numSpans === 1) {
      const b = new Array<number>(27).fill(0);
      b[0] = RecordTypes.BrtRowHdr;
      b[1] = 25;
      b[2] = row & 0xFF;
      b[3] = (row >>> 8) & 0xFF;
      b[4] = (row >>> 16) & 0xFF;
      b[5] = (row >>> 24) & 0xFF;
      b[10] = 0x0E;
      b[11] = 0x01;
      b[15] = 1;
      const last = colCount - 1;
      b[23] = last & 0xFF;
      b[24] = (last >>> 8) & 0xFF;
      b[25] = (last >>> 16) & 0xFF;
      b[26] = (last >>> 24) & 0xFF;
      w.writeBytes(b);
      return;
    }

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
        // 空白单元格不生成记录（与 jxlsb/rxlsb 一致），避免文件膨胀。
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
    const b = new Array<number>(14).fill(0);
    b[0] = RecordTypes.BrtCellRk;
    b[1] = 12;
    w.writeCellHeader(b, 2, col, styleIndex);
    const rk = this.encodeRk(value);
    b[10] = rk & 0xFF;
    b[11] = (rk >>> 8) & 0xFF;
    b[12] = (rk >>> 16) & 0xFF;
    b[13] = (rk >>> 24) & 0xFF;
    w.writeBytes(b);
  }

  private writeBrtCellReal(w: Biff12Writer, col: number, value: number, styleIndex: number): void {
    const b = new Array<number>(18).fill(0);
    b[0] = RecordTypes.BrtCellReal;
    b[1] = 16;
    w.writeCellHeader(b, 2, col, styleIndex);
    const dv = new DataView(new ArrayBuffer(8));
    dv.setFloat64(0, value, true);
    for (let i = 0; i < 8; i++) b[10 + i] = dv.getUint8(i);
    w.writeBytes(b);
  }

  private writeBrtCellBool(w: Biff12Writer, col: number, value: boolean, styleIndex: number): void {
    const b = new Array<number>(11).fill(0);
    b[0] = RecordTypes.BrtCellBool;
    b[1] = 9;
    w.writeCellHeader(b, 2, col, styleIndex);
    b[10] = value ? 1 : 0;
    w.writeBytes(b);
  }

  private writeBrtCellIsst(w: Biff12Writer, col: number, sstIndex: number, styleIndex: number): void {
    const b = new Array<number>(14).fill(0);
    b[0] = RecordTypes.BrtCellIsst;
    b[1] = 12;
    w.writeCellHeader(b, 2, col, styleIndex);
    b[10] = sstIndex & 0xFF;
    b[11] = (sstIndex >>> 8) & 0xFF;
    b[12] = (sstIndex >>> 16) & 0xFF;
    b[13] = (sstIndex >>> 24) & 0xFF;
    w.writeBytes(b);
  }

  private writeBrtCellBlank(w: Biff12Writer, col: number, styleIndex: number): void {
    const b = new Array<number>(10).fill(0);
    b[0] = RecordTypes.BrtCellBlank;
    b[1] = 8;
    w.writeCellHeader(b, 2, col, styleIndex);
    w.writeBytes(b);
  }

  private encodeRk(value: number): number {
    // 标准 RK 整数形式：num(30 位有符号)<<2 | fInt(bit1)=1
    return (((value << 2) | 0x02) >>> 0);
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

  writeSheetWithTemplate(
    supplier: CellDataSupplier,
    rowCount: number,
    columnCount: number,
    startRow: number,
    startCol: number,
    templateCells: CellInfo[],
    templateMaxRow: number,
    templateMaxCol: number,
    mergeCells: MergeCell[]
  ): Uint8Array {
    // 底层维度限制：与批量/流式写入使用同一策略（模板填充也受控）。
    const limits = SheetLimits.begin(Math.max(templateMaxCol + 1, startCol + columnCount));
    const totalCols = limits.columns();
    const maxCol = totalCols - 1;
    const totalRows = limits.rows(0, Math.max(templateMaxRow + 1, startRow + rowCount));

    const w = new Biff12Writer();

    this.writeSheetHeader(w, totalRows, totalCols);
    w.writeEmptyRecord(RecordTypes.BrtBeginSheetData);

    for (let row = 0; row < totalRows; row++) {
      this.writeBrtRowHdr(w, row, totalCols);
      this.writeTemplateCellsForRow(w, row, templateCells, startRow, rowCount, startCol, columnCount, maxCol);
      this.writeFillCellsForRow(w, row, supplier, startRow, rowCount, startCol, columnCount, maxCol);
    }

    this.writeSheetFooterWithMerge(w, mergeCells);

    return w.toUint8Array();
  }

  private writeTemplateCellsForRow(
    w: Biff12Writer,
    row: number,
    templateCells: CellInfo[],
    startRow: number,
    rowCount: number,
    startCol: number,
    columnCount: number,
    maxCol: number
  ): void {
    for (const cell of templateCells) {
      if (cell.col > maxCol) continue;
      if (cell.row === row && this.isOutsideFillArea(cell.row, cell.col, startRow, rowCount, startCol, columnCount)) {
        this.writeCellWithStyle(w, cell.row, cell.col, cell.data, cell.styleIndex);
      }
    }
  }

  private writeFillCellsForRow(
    w: Biff12Writer,
    row: number,
    supplier: CellDataSupplier,
    startRow: number,
    rowCount: number,
    startCol: number,
    columnCount: number,
    maxCol: number
  ): void {
    if (row >= startRow && row < startRow + rowCount && startCol <= maxCol) {
      const fillEnd = Math.min(startCol + columnCount - 1, maxCol);
      for (let col = startCol; col <= fillEnd; col++) {
        const data = supplier.get(row, col);
        if (data && data.type && data.type !== CellType.BLANK) {
          this.writeCell(w, row, col, data);
        }
      }
    }
  }

  private isOutsideFillArea(
    cellRow: number,
    cellCol: number,
    startRow: number,
    rowCount: number,
    startCol: number,
    columnCount: number
  ): boolean {
    return cellRow < startRow || cellRow >= startRow + rowCount ||
           cellCol < startCol || cellCol >= startCol + columnCount;
  }

  private writeCellWithStyle(w: Biff12Writer, row: number, col: number, data: CellData, styleIndex: number): void {
    this.writeCell(w, row, col, data, styleIndex);
  }

  private writeSheetFooterWithMerge(w: Biff12Writer, mergeCells: MergeCell[]): void {
    w.writeEmptyRecord(RecordTypes.BrtEndSheetData);

    if (mergeCells && mergeCells.length > 0) {
      this.writeMergeCells(w, mergeCells);
    }

    this.writePageSetupRecords(w);
    w.writeEmptyRecord(RecordTypes.BrtEndSheet);
  }

  private writeMergeCells(w: Biff12Writer, mergeCells: MergeCell[]): void {
    w.writeRecordHeader(RecordTypes.BrtBeginMergeCells, 4);
    w.writeIntLE(mergeCells.length);

    for (const merge of mergeCells) {
      w.writeRecordHeader(RecordTypes.BrtMergeCell, 16);
      w.writeIntLE(merge.rowFirst);
      w.writeIntLE(merge.rowLast);
      w.writeIntLE(merge.colFirst);
      w.writeIntLE(merge.colLast);
    }

    w.writeEmptyRecord(RecordTypes.BrtEndMergeCells);
  }
}
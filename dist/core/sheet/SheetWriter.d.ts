import { CellData } from '../cell/CellData';
import { SharedStringsTable } from '../sst/SharedStringsTable';
export interface CellDataSupplier {
    get(row: number, col: number): CellData | null;
}
export declare class SheetWriter {
    private sst;
    private stylesWriter;
    private defaultDateStyleId;
    private streamingWriter;
    private streamingColumnCount;
    constructor(sst: SharedStringsTable, stylesWriter?: any);
    writeSheet(supplier: CellDataSupplier, rowCount: number, columnCount: number): Uint8Array;
    startStreaming(columnCount: number): void;
    appendRows(supplier: CellDataSupplier, startRow: number, batchSize: number, columnCount: number): void;
    finalizeStreaming(totalRows: number, columnCount: number): Uint8Array;
    private writeSheetHeader;
    private writeSheetFooter;
    private writeBrtRowHdr;
    private writeCell;
    private writeBrtCellRk;
    private writeBrtCellReal;
    private writeBrtCellBool;
    private writeBrtCellIsst;
    private writeBrtCellBlank;
    private encodeRk;
    private writeBrtWsProp;
    private writeViewRecords;
    private writePageSetupRecords;
    getStreamingColumnCount(): number;
}

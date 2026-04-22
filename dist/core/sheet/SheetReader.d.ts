import { SharedStringsTable } from '../sst/SharedStringsTable';
export interface InternalRowHandler {
    onRowStart(rowIndex: number, columnCount: number): void;
    onCellNumber(row: number, col: number, value: number, styleIndex: number): void;
    onCellText(row: number, col: number, value: string, styleIndex: number): void;
    onCellBoolean(row: number, col: number, value: boolean, styleIndex: number): void;
    onCellBlank(row: number, col: number, styleIndex: number): void;
    onRowEnd(rowIndex: number): void;
}
export declare class BatchCompleteException extends Error {
    constructor();
}
export declare class SheetReader {
    private buffer;
    private sst;
    private currentRow;
    private currentHandler;
    constructor(buffer: Uint8Array, sst: SharedStringsTable);
    readRows(handler: InternalRowHandler): void;
    private handleBrtRowHdr;
    private readStyleIndex;
    private handleBrtCellRk;
    private handleBrtCellReal;
    private handleBrtCellSt;
    private handleBrtCellBool;
    private handleBrtCellBlank;
    private handleBrtCellIsst;
    private decodeRk;
}

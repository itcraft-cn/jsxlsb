export declare class Biff12Writer {
    private buffer;
    writeRecordHeader(recordType: number, recordSize: number): void;
    writeEmptyRecord(recordType: number): void;
    writeIntLE(value: number): void;
    writeDoubleLE(value: number): void;
    writeBytes(bytes: number[] | Uint8Array): void;
    writeXLWideString(str: string): void;
    writeCell(column: number, styleIndex?: number): void;
    writeBrtRowHdr(row: number, columnCount: number): void;
    writeBrtCellBlank(row: number, col: number, styleIndex?: number): void;
    writeBrtCellRk(row: number, col: number, value: number, styleIndex?: number): void;
    writeBrtCellReal(row: number, col: number, value: number, styleIndex?: number): void;
    writeBrtCellBool(row: number, col: number, value: boolean, styleIndex?: number): void;
    writeBrtCellIsst(row: number, col: number, sstIndex: number, styleIndex?: number): void;
    writeBrtCellSt(row: number, col: number, text: string, styleIndex?: number): void;
    writeBrtWsDim(rowFirst: number, rowLast: number, colFirst: number, colLast: number): void;
    writeBrtBeginSheet(): void;
    writeBrtEndSheet(): void;
    writeBrtBeginSheetData(): void;
    writeBrtEndSheetData(): void;
    private encodeRk;
    toUint8Array(): Uint8Array;
    toArray(): number[];
    size(): number;
    reset(): void;
}

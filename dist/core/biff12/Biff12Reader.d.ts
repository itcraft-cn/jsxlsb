export interface Biff12Record {
    type: number;
    size: number;
    data: Uint8Array;
}
export declare class Biff12Reader {
    private buffer;
    private offset;
    constructor(buffer: Uint8Array);
    hasNext(): boolean;
    nextRecord(): Biff12Record | null;
    readAllRecords(): Biff12Record[];
    getOffset(): number;
    setOffset(offset: number): void;
}
export declare function parseBrtCellRk(data: Uint8Array): {
    col: number;
    value: number;
    styleIndex: number;
};
export declare function parseBrtCellReal(data: Uint8Array): {
    col: number;
    value: number;
    styleIndex: number;
};
export declare function parseBrtCellBool(data: Uint8Array): {
    col: number;
    value: boolean;
    styleIndex: number;
};
export declare function parseBrtCellIsst(data: Uint8Array): {
    col: number;
    sstIndex: number;
    styleIndex: number;
};
export declare function parseBrtCellSt(data: Uint8Array): {
    col: number;
    text: string;
    styleIndex: number;
};
export declare function parseBrtCellBlank(data: Uint8Array): {
    col: number;
    styleIndex: number;
};
export declare function parseBrtRowHdr(data: Uint8Array): {
    row: number;
};
export declare function parseBrtWsDim(data: Uint8Array): {
    rowFirst: number;
    rowLast: number;
    colFirst: number;
    colLast: number;
};
export declare function parseBrtSSTItem(data: Uint8Array): string;

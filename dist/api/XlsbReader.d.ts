import { CellData } from '../core/cell/CellData';
import { StylesReader } from '../core/style/StylesReader';
import { SheetInfo, RowHandler } from './interfaces';
export interface XlsbReaderOptions {
    path?: string;
    buffer?: Uint8Array;
}
export declare class XlsbReader {
    private container;
    private sst;
    private styles;
    private buffer;
    private constructor();
    private loadSharedStringsTable;
    private loadStylesTable;
    getSheetInfos(): SheetInfo[];
    forEachRow(sheetIndex: number, handler: RowHandler): void;
    readRows(sheetIndex: number, startRow: number, batchSize: number): CellData[][];
    private getSheetBuffer;
    hasSharedStrings(): boolean;
    getStyles(): StylesReader;
    close(): void;
    static builder(): XlsbReaderBuilder;
    static fromFile(file: File): Promise<XlsbReader>;
}
declare class XlsbReaderBuilder {
    private options;
    path(filePath: string): XlsbReaderBuilder;
    buffer(data: Uint8Array): XlsbReaderBuilder;
    build(): XlsbReader;
}
export {};

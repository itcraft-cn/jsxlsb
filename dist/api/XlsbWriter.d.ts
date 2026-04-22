import { CellData } from '../core/cell/CellData';
export interface XlsbWriterOptions {
    path?: string;
    buffer?: boolean;
}
export declare class XlsbWriter {
    private container;
    private sharedStrings;
    private workbookWriter;
    private stylesWriter;
    private sheetWriter;
    private sheetCount;
    private currentSheetName;
    private currentColumnCount;
    private currentRowCount;
    private outputPath?;
    private bufferMode;
    private constructor();
    writeBatch(sheetName: string, data: CellData[][]): void;
    startSheet(sheetName: string, columnCount: number): void;
    writeRows(data: CellData[][]): void;
    endSheet(): void;
    close(): Uint8Array | void;
    private writeContainerStructure;
    private writeFile;
    static builder(): XlsbWriterBuilder;
}
declare class XlsbWriterBuilder {
    private options;
    path(filePath: string): XlsbWriterBuilder;
    buffer(): XlsbWriterBuilder;
    build(): XlsbWriter;
}
export {};

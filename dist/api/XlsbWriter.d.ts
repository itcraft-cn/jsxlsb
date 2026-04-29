import { CellData } from '../core/cell/CellData';
export interface XlsbWriterOptions {
    path?: string;
    buffer?: boolean;
    templatePath?: string;
    templateBuffer?: Uint8Array;
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
    private isTemplateMode;
    private templateReader;
    private templateSheetCount;
    private currentFillSheetIndex;
    private fillStartRow;
    private fillStartCol;
    private fillRowCount;
    private streamingTemplateCells;
    private streamingTemplateMaxRow;
    private streamingTemplateMaxCol;
    private streamingMergeCells;
    private streamingAccumulatedData;
    private constructor();
    private loadTemplateFile;
    private copyTemplateStyles;
    writeBatch(sheetName: string, data: CellData[][]): void;
    startSheet(sheetName: string, columnCount: number): void;
    writeRows(data: CellData[][]): void;
    endSheet(): void;
    getTemplateSheetCount(): number;
    getTemplateSheetInfos(): any[];
    fillBatch(sheetIndex: number, dataList: any[][], startRow: number, startCol: number): void;
    fillAtMarker(sheetIndex: number, marker: string, dataList: any[][]): void;
    startFill(sheetIndex: number, startRow: number, startCol: number): void;
    fillRows(dataList: any[][]): void;
    endFill(): void;
    close(): Uint8Array | void;
    private writeContainerStructure;
    private writeFile;
    static builder(): XlsbWriterBuilder;
}
declare class XlsbWriterBuilder {
    private options;
    path(filePath: string): XlsbWriterBuilder;
    buffer(): XlsbWriterBuilder;
    template(templatePath: string): XlsbWriterBuilder;
    templateBuffer(buffer: Uint8Array): XlsbWriterBuilder;
    build(): XlsbWriter;
}
export {};

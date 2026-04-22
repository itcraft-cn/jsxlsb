import { SheetInfo } from '../../api/interfaces';
export declare class WorkbookReader {
    private buffer;
    constructor(buffer: Uint8Array);
    parseSheetList(): SheetInfo[];
    private parseBrtBundleSh;
    private readXLWideString;
}

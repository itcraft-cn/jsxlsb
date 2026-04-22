export declare class RelsGenerator {
    static generateRootRels(): string;
    static generateWorkbookRels(sheetCount: number, hasSST: boolean): string;
    static toUint8Array(xml: string): Uint8Array;
}

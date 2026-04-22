export declare class WorkbookWriter {
    private sheets;
    addSheet(name: string): void;
    getSheetCount(): number;
    toBiff12Bytes(): Uint8Array;
    private writeBrtFileVersion;
    private writeBrtWbProp;
    private writeBrtBookView;
    private writeBrtBundleSh;
}

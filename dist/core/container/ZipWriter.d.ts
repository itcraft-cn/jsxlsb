export interface ZipEntryData {
    name: string;
    data: Uint8Array;
}
export declare class ZipWriter {
    private entries;
    addEntry(name: string, data: Uint8Array): void;
    toBlob(): Promise<Blob>;
    toUint8Array(): Uint8Array;
    private compress;
    private createLocalFileHeaderArray;
    private createCentralDirectoryHeaderArray;
    private createEndOfCentralDirectoryArray;
    private writeUInt16LE;
    private writeUInt32LE;
    private encodeString;
    clear(): void;
    getEntryCount(): number;
}

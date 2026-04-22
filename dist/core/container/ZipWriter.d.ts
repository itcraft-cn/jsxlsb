export interface ZipEntryData {
    name: string;
    data: Uint8Array;
}
export declare class ZipWriter {
    private entries;
    addEntry(name: string, data: Uint8Array): void;
    toBlob(): Promise<Blob>;
    toUint8Array(): Uint8Array;
    private createLocalFileHeader;
    private createDataDescriptor;
    private createCentralDirectoryHeader;
    private createEndOfCentralDirectory;
    private calculateCRC32;
    private getCRC32Table;
    clear(): void;
    getEntryCount(): number;
}

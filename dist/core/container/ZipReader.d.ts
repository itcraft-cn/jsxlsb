export interface ZipEntryInfo {
    name: string;
    compressedSize: number;
    uncompressedSize: number;
    offset: number;
    compressionMethod: number;
}
export declare class ZipReader {
    private buffer;
    private entries;
    private entryMap;
    constructor(buffer: Uint8Array);
    private parse;
    getEntry(name: string): ZipEntryInfo | null;
    getEntryData(name: string): Uint8Array | null;
    getAllEntryNames(): string[];
    private decompress;
    private decompressPureJS;
    private parseDynamicHuffman;
    private buildHuffmanTables;
    private getLengthBase;
    private getLengthExtraBits;
    private getDistanceBase;
    private getDistanceExtraBits;
    private readUInt16LE;
    private readUInt32LE;
    private decodeString;
}

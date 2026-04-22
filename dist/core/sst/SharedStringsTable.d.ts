export declare class SharedStringsTable {
    private strings;
    private indexMap;
    private totalCount;
    addString(str: string): number;
    getString(index: number): string;
    getCount(): number;
    getTotalCount(): number;
    size(): number;
    clear(): void;
    toBiff12Bytes(): Uint8Array;
    private writeSSTItem;
    load(buffer: Uint8Array): void;
    private parseSSTItem;
}

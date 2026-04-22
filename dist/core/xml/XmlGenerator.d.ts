export declare class XmlGenerator {
    static generateAppXml(sheetCount: number, sheetNames?: string[]): string;
    static generateCoreXml(): string;
    static generateThemeXml(): string;
    static toUint8Array(xml: string): Uint8Array;
    private static escapeXml;
}

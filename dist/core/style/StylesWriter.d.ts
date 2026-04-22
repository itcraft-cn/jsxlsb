export declare class StylesWriter {
    private dateFormats;
    private formatRegistry;
    private styleRegistry;
    private nextFormatId;
    addDateFormat(formatCode: string): number;
    toBiff12Bytes(): Uint8Array;
    private writeFormats;
    private writeBrtFmt;
    private writeFonts;
    private writeBrtFont;
    private writeFills;
    private writeBrtFill;
    private writeBorders;
    private writeCellStyleXFs2;
    private writeStyles;
    private writeStyleXF;
}

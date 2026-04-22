export declare class StylesReader {
    private formats;
    private xfFormatIds;
    private styleFormatIds;
    load(buffer: Uint8Array): void;
    private handleBrtFmt;
    private handleBrtXF;
    getFormatCode(styleIndex: number): string | undefined;
    private getBuiltinFormat;
    getFormats(): Map<number, string>;
    getStyleCount(): number;
}

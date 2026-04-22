import { CellType } from './CellType';
export declare class CellData {
    readonly type: CellType;
    readonly value: string | number | boolean | null;
    readonly formatCode?: string;
    readonly styleIndex?: number;
    private constructor();
    static text(value: string): CellData;
    static number(value: number, formatCode?: string): CellData;
    static date(timestamp: number, formatCode?: string): CellData;
    static bool(value: boolean): CellData;
    static blank(): CellData;
    static percentage(value: number, decimals?: number): CellData;
    static time(timestamp: number, formatCode?: string): CellData;
    static numberNegativeRed(value: number): CellData;
    static numberWithComma(value: number, decimals?: number): CellData;
    static currency(value: number, symbol?: string): CellData;
    isText(): boolean;
    isNumber(): boolean;
    isBoolean(): boolean;
    isDate(): boolean;
    isBlank(): boolean;
    getTextValue(): string | null;
    getNumberValue(): number | null;
    getBooleanValue(): boolean | null;
    getDateValue(): number | null;
    hasFormatCode(): boolean;
}

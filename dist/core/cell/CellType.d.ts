export declare enum CellType {
    TEXT = "text",
    NUMBER = "number",
    DATE = "date",
    BOOLEAN = "boolean",
    ERROR = "error",
    BLANK = "blank"
}
export declare function cellTypeFromCode(code: number): CellType;

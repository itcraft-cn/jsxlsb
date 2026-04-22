import { CellType } from './CellType';

export class CellData {
  readonly type: CellType;
  readonly value: string | number | boolean | null;
  readonly formatCode?: string;
  readonly styleIndex?: number;

  private constructor(
    type: CellType,
    value: string | number | boolean | null,
    formatCode?: string,
    styleIndex?: number
  ) {
    this.type = type;
    this.value = value;
    this.formatCode = formatCode;
    this.styleIndex = styleIndex;
  }

  static text(value: string): CellData {
    return new CellData(CellType.TEXT, value);
  }

  static number(value: number, formatCode?: string): CellData {
    return new CellData(CellType.NUMBER, value, formatCode);
  }

  static date(timestamp: number, formatCode?: string): CellData {
    return new CellData(CellType.DATE, timestamp, formatCode);
  }

  static bool(value: boolean): CellData {
    return new CellData(CellType.BOOLEAN, value);
  }

  static blank(): CellData {
    return new CellData(CellType.BLANK, null);
  }

  static percentage(value: number, decimals = 2): CellData {
    const formatCode = decimals === 0 ? '0%' : '0.' + '0'.repeat(decimals) + '%';
    return new CellData(CellType.NUMBER, value, formatCode);
  }

  static time(timestamp: number, formatCode = 'h:mm:ss'): CellData {
    return new CellData(CellType.DATE, timestamp, formatCode);
  }

  static numberNegativeRed(value: number): CellData {
    return new CellData(CellType.NUMBER, value, '#,##0.00;[Red]-#,##0.00');
  }

  static numberWithComma(value: number, decimals = 2): CellData {
    const formatCode = decimals === 0 ? '#,##0' : '#,##0.' + '0'.repeat(decimals);
    return new CellData(CellType.NUMBER, value, formatCode);
  }

  static currency(value: number, symbol = '￥'): CellData {
    return new CellData(CellType.NUMBER, value, symbol + '#,##0.00');
  }

  isText(): boolean { return this.type === CellType.TEXT; }
  isNumber(): boolean { return this.type === CellType.NUMBER; }
  isBoolean(): boolean { return this.type === CellType.BOOLEAN; }
  isDate(): boolean { return this.type === CellType.DATE; }
  isBlank(): boolean { return this.type === CellType.BLANK; }

  getTextValue(): string | null {
    return this.type === CellType.TEXT ? this.value as string : null;
  }

  getNumberValue(): number | null {
    return this.type === CellType.NUMBER ? this.value as number : null;
  }

  getBooleanValue(): boolean | null {
    return this.type === CellType.BOOLEAN ? this.value as boolean : null;
  }

  getDateValue(): number | null {
    return this.type === CellType.DATE ? this.value as number : null;
  }

  hasFormatCode(): boolean {
    return this.formatCode !== undefined && this.formatCode !== null;
  }
}
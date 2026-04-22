export enum CellType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  BOOLEAN = 'boolean',
  ERROR = 'error',
  BLANK = 'blank'
}

export function cellTypeFromCode(code: number): CellType {
  switch (code) {
    case 0: return CellType.TEXT;
    case 1: return CellType.NUMBER;
    case 2: return CellType.DATE;
    case 3: return CellType.BOOLEAN;
    case 4: return CellType.ERROR;
    default: return CellType.BLANK;
  }
}
/**
 * Excel 行列上限与溢出策略。
 *
 * Excel XLSB 的硬上限为 16384 列、1048576 行。超出上限时的行为由全局策略决定：
 * - Error：抛出 LimitExceededError；
 * - Cut：静默截断到上限。
 *
 * 配置是全局的，可随时修改；每次写入操作开始时快照，只影响其后的操作。
 * 列/行各自独立配置，`setOverflow` 可一次设置两者（按维度“后设置覆盖先设置”）。
 */

export const MAX_COLUMNS = 16384;
export const MAX_ROWS = 1048576;

export enum OverflowBehavior {
  Error = 0,
  Cut = 1
}

export class LimitExceededError extends Error {
  constructor(
    public readonly dimension: 'columns' | 'rows',
    public readonly requested: number,
    public readonly limit: number
  ) {
    super(`${dimension} exceeded: requested ${requested}, limit ${limit}`);
    this.name = 'LimitExceededError';
  }
}

let columnBehavior: OverflowBehavior = OverflowBehavior.Error;
let rowBehavior: OverflowBehavior = OverflowBehavior.Error;

export function setColumnOverflow(behavior: OverflowBehavior): void {
  columnBehavior = behavior === OverflowBehavior.Cut ? OverflowBehavior.Cut : OverflowBehavior.Error;
}

export function setRowOverflow(behavior: OverflowBehavior): void {
  rowBehavior = behavior === OverflowBehavior.Cut ? OverflowBehavior.Cut : OverflowBehavior.Error;
}

export function setOverflow(columns: OverflowBehavior, rows: OverflowBehavior): void {
  setColumnOverflow(columns);
  setRowOverflow(rows);
}

export function columnOverflow(): OverflowBehavior {
  return columnBehavior;
}

export function rowOverflow(): OverflowBehavior {
  return rowBehavior;
}

/** 一次写入操作内的维度限制快照。 */
export class SheetLimits {
  private constructor(
    private readonly _columns: number,
    private readonly _rowBehavior: OverflowBehavior
  ) {}

  static begin(requestedColumns: number): SheetLimits {
    let columns = requestedColumns;
    if (columns > MAX_COLUMNS) {
      if (columnBehavior === OverflowBehavior.Cut) {
        columns = MAX_COLUMNS;
      } else {
        throw new LimitExceededError('columns', requestedColumns, MAX_COLUMNS);
      }
    }
    return new SheetLimits(columns, rowBehavior);
  }

  columns(): number {
    return this._columns;
  }

  rows(startRow: number, requested: number): number {
    if (startRow >= MAX_ROWS) {
      if (this._rowBehavior === OverflowBehavior.Cut) return 0;
      throw new LimitExceededError('rows', startRow + requested, MAX_ROWS);
    }
    if (startRow + requested > MAX_ROWS) {
      if (this._rowBehavior === OverflowBehavior.Cut) {
        return MAX_ROWS - startRow;
      }
      throw new LimitExceededError('rows', startRow + requested, MAX_ROWS);
    }
    return requested;
  }
}

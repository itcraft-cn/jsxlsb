import { CellData } from '../core/cell/CellData';

export interface SheetInfo {
  name: string;
  index: number;
  path: string;
}

export interface RowHandler {
  onRowStart(rowIndex: number, columnCount: number): void;
  onCell(row: number, col: number, cellData: CellData): void;
  onRowEnd(rowIndex: number): void;
}

export interface SheetConsumer {
  accept(info: SheetInfo, reader: any): void;
}
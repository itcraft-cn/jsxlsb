import { CanvasConfig, defaultCanvasConfig } from './CanvasConfig';
import { XlsbReader } from '../../api/XlsbReader';
import { CellData } from '../../core/cell/CellData';
import { CellType } from '../../core/cell/CellType';

interface Viewport {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

interface CellCache {
  [key: string]: CellData;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private config: CanvasConfig;
  private reader: XlsbReader | null = null;
  private sheetIndex: number = 0;
  private viewport: Viewport = { startRow: 0, endRow: 50, startCol: 0, endCol: 30 };
  private cellCache: CellCache = {};
  private zoom: number = 1;
  private maxRow: number = 0;
  private maxCol: number = 0;
  private scrollY: number = 0;
  private scrollX: number = 0;

  constructor(config?: Partial<CanvasConfig>) {
    this.config = { ...defaultCanvasConfig, ...config };
  }

  render(canvas: HTMLCanvasElement, reader: XlsbReader, sheetIndex: number, config?: Partial<CanvasConfig>): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.reader = reader;
    this.sheetIndex = sheetIndex;

    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.calculateDimensions();
    this.loadCellData();
    this.draw();

    this.setupScrollHandler();
  }

  private calculateDimensions(): void {
    if (!this.canvas) return;

    const width = this.canvas.width;
    const height = this.canvas.height;

    const visibleCols = Math.floor((width - this.config.headerWidth) / (this.config.cellWidth * this.zoom));
    const visibleRows = Math.floor((height - this.config.headerHeight) / (this.config.cellHeight * this.zoom));

    this.viewport = {
      startRow: 0,
      endRow: Math.min(visibleRows, this.config.maxRenderRows),
      startCol: 0,
      endCol: Math.min(visibleCols, this.config.maxRenderColumns)
    };
  }

  private loadCellData(): void {
    if (!this.reader) return;

    const self = this;
    this.cellCache = {};
    this.maxRow = 0;
    this.maxCol = 0;

    this.reader.forEachRow(this.sheetIndex, {
      onRowStart(rowIndex: number, columnCount: number) {},
      onCell(row: number, col: number, cellData: CellData) {
        self.cellCache[`${row}_${col}`] = cellData;
        self.maxRow = Math.max(self.maxRow, row);
        self.maxCol = Math.max(self.maxCol, col);
      },
      onRowEnd(rowIndex: number) {}
    });
  }

  private draw(): void {
    if (!this.ctx || !this.canvas) return;

    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    ctx.fillStyle = this.config.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    this.drawHeader(ctx);

    this.drawCells(ctx);

    this.drawGrid(ctx);
  }

  private drawHeader(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.config.headerBackgroundColor;
    ctx.fillRect(0, 0, this.config.headerWidth, this.config.headerHeight);

    ctx.fillRect(this.config.headerWidth, 0, this.canvas!.width - this.config.headerWidth, this.config.headerHeight);
    ctx.fillRect(0, this.config.headerHeight, this.config.headerWidth, this.canvas!.height - this.config.headerHeight);

    ctx.fillStyle = this.config.textColor;
    ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let col = this.viewport.startCol; col <= this.viewport.endCol; col++) {
      const x = this.config.headerWidth + (col - this.viewport.startCol) * this.config.cellWidth * this.zoom + this.config.cellWidth * this.zoom / 2;
      ctx.fillText(this.columnToLetter(col), x, this.config.headerHeight / 2);
    }

    ctx.textAlign = 'right';
    for (let row = this.viewport.startRow; row <= this.viewport.endRow; row++) {
      const y = this.config.headerHeight + (row - this.viewport.startRow) * this.config.cellHeight * this.zoom + this.config.cellHeight * this.zoom / 2;
      ctx.fillText(String(row + 1), this.config.headerWidth - 4, y);
    }
  }

  private drawCells(ctx: CanvasRenderingContext2D): void {
    ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;

    for (let row = this.viewport.startRow; row <= this.viewport.endRow; row++) {
      for (let col = this.viewport.startCol; col <= this.viewport.endCol; col++) {
        const cellData = this.cellCache[`${row}_${col}`];
        if (!cellData) continue;

        const x = this.config.headerWidth + (col - this.viewport.startCol) * this.config.cellWidth * this.zoom;
        const y = this.config.headerHeight + (row - this.viewport.startRow) * this.config.cellHeight * this.zoom;

        ctx.fillStyle = this.config.textColor;
        ctx.textBaseline = 'middle';

        const text = this.formatCellText(cellData);

        if (cellData.isNumber()) {
          ctx.textAlign = 'right';
          ctx.fillText(text, x + this.config.cellWidth * this.zoom - 4, y + this.config.cellHeight * this.zoom / 2);
        } else {
          ctx.textAlign = 'left';
          ctx.fillText(text, x + 4, y + this.config.cellHeight * this.zoom / 2);
        }
      }
    }
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = this.config.borderColor;
    ctx.lineWidth = 1;

    const startX = this.config.headerWidth;
    const startY = this.config.headerHeight;

    for (let col = this.viewport.startCol; col <= this.viewport.endCol + 1; col++) {
      const x = startX + (col - this.viewport.startCol) * this.config.cellWidth * this.zoom;
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, this.canvas!.height);
      ctx.stroke();
    }

    for (let row = this.viewport.startRow; row <= this.viewport.endRow + 1; row++) {
      const y = startY + (row - this.viewport.startRow) * this.config.cellHeight * this.zoom;
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(this.canvas!.width, y);
      ctx.stroke();
    }
  }

  private setupScrollHandler(): void {
    if (!this.canvas) return;

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();

      const deltaY = e.deltaY > 0 ? 1 : -1;
      const deltaX = e.deltaX > 0 ? 1 : -1;

      const newRow = Math.max(0, Math.min(this.viewport.startRow + deltaY, this.maxRow - this.viewport.endRow + this.viewport.startRow));
      const newCol = Math.max(0, Math.min(this.viewport.startCol + deltaX, this.maxCol - this.viewport.endCol + this.viewport.startCol));

      if (newRow !== this.viewport.startRow || newCol !== this.viewport.startCol) {
        this.viewport.startRow = newRow;
        this.viewport.endRow = newRow + (this.viewport.endRow - this.viewport.startRow);
        this.viewport.startCol = newCol;
        this.viewport.endCol = newCol + (this.viewport.endCol - this.viewport.startCol);
        this.draw();
      }
    });
  }

  setZoom(zoom: number): void {
    this.zoom = Math.max(0.5, Math.min(3, zoom));
    this.calculateDimensions();
    this.draw();
  }

  scrollTo(row: number, col: number): void {
    this.viewport.startRow = Math.max(0, row);
    this.viewport.startCol = Math.max(0, col);
    this.calculateDimensions();
    this.draw();
  }

  destroy(): void {
    if (this.canvas) {
      this.canvas.removeEventListener('wheel', this.setupScrollHandler as any);
    }
    this.canvas = null;
    this.ctx = null;
    this.reader = null;
    this.cellCache = {};
  }

  private columnToLetter(col: number): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (col < 26) {
      return letters[col];
    }
    const firstLetter = Math.floor(col / 26) - 1;
    const secondLetter = col % 26;
    return letters[firstLetter] + letters[secondLetter];
  }

  private formatCellText(cellData: CellData): string {
    if (cellData.isNumber()) {
      const value = cellData.getNumberValue()!;
      const formatCode = cellData.formatCode;

      if (formatCode) {
        if (formatCode.includes('%')) {
          return (value * 100).toFixed(2) + '%';
        }
        if (formatCode.includes('#,##0')) {
          return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
      }
      return String(value);
    }

    if (cellData.isText()) {
      return cellData.getTextValue() || '';
    }

    if (cellData.isBoolean()) {
      return cellData.getBooleanValue() ? 'TRUE' : 'FALSE';
    }

    if (cellData.isDate()) {
      const timestamp = cellData.getDateValue()!;
      return new Date(timestamp).toLocaleDateString();
    }

    return '';
  }
}
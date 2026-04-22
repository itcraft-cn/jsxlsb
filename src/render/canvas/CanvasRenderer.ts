import { CanvasConfig, defaultCanvasConfig } from './CanvasConfig';
import { XlsbReader } from '../../api/XlsbReader';
import { CellData } from '../../core/cell/CellData';
import { CellType } from '../../core/cell/CellType';
import { formatCell, isDateFormat } from '../../utils/FormatUtils';

interface Viewport {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

interface CellCache {
  [key: string]: CellData;
}

interface ColumnWidths {
  [col: number]: number;
}

const MIN_CELL_WIDTH = 40;
const MAX_CELL_WIDTH = 200;
const DEFAULT_CELL_WIDTH = 80;

export class CanvasRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private config: CanvasConfig;
  private reader: XlsbReader | null = null;
  private sheetIndex: number = 0;
  private viewport: Viewport = { startRow: 0, endRow: 50, startCol: 0, endCol: 30 };
  private cellCache: CellCache = {};
  private columnWidths: ColumnWidths = {};
  private zoom: number = 1;
  private maxRow: number = 0;
  private maxCol: number = 0;
  private displayWidth: number = 0;
  private displayHeight: number = 0;
  private dpr: number = 1;

  constructor(config?: Partial<CanvasConfig>) {
    this.config = { ...defaultCanvasConfig, ...config };
  }

  render(canvas: HTMLCanvasElement, reader: XlsbReader, sheetIndex: number, config?: Partial<CanvasConfig>): void {
    this.canvas = canvas;
    this.reader = reader;
    this.sheetIndex = sheetIndex;

    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.dpr = window.devicePixelRatio || 1;
    this.displayWidth = canvas.clientWidth || canvas.width;
    this.displayHeight = canvas.clientHeight || canvas.height;

    canvas.width = Math.floor(this.displayWidth * this.dpr);
    canvas.height = Math.floor(this.displayHeight * this.dpr);
    canvas.style.width = this.displayWidth + 'px';
    canvas.style.height = this.displayHeight + 'px';

    this.ctx = canvas.getContext('2d', { alpha: false });
    if (this.ctx) {
      this.ctx.scale(this.dpr, this.dpr);
    }

    this.loadCellData();
    this.calculateColumnWidths();
    this.calculateDimensions();
    this.draw();
    this.setupScrollHandler();
  }

  private loadCellData(): void {
    if (!this.reader || !this.ctx) return;

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

  private calculateColumnWidths(): void {
    if (!this.ctx) return;

    this.ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;
    this.columnWidths = {};

    for (let col = 0; col <= this.maxCol; col++) {
      let maxWidth = MIN_CELL_WIDTH;

      for (let row = 0; row <= this.maxRow; row++) {
        const cellData = this.cellCache[`${row}_${col}`];
        if (!cellData) continue;

        const result = this.formatCellText(cellData);
        const textWidth = this.ctx.measureText(result.text).width;
        const paddedWidth = textWidth + 16;
        maxWidth = Math.max(maxWidth, Math.min(paddedWidth, MAX_CELL_WIDTH));
      }

      this.columnWidths[col] = Math.floor(maxWidth);
    }
  }

  private getCellWidth(col: number): number {
    return (this.columnWidths[col] || DEFAULT_CELL_WIDTH) * this.zoom;
  }

  private calculateDimensions(): void {
    if (!this.canvas) return;

    const visibleRows = Math.floor((this.displayHeight - this.config.headerHeight) / (this.config.cellHeight * this.zoom));
    
    let totalWidth = 0;
    let visibleCols = 0;
    for (let col = 0; col <= this.maxCol && totalWidth < this.displayWidth - this.config.headerWidth; col++) {
      totalWidth += this.getCellWidth(col);
      visibleCols++;
    }

    this.viewport = {
      startRow: 0,
      endRow: Math.min(visibleRows, this.config.maxRenderRows),
      startCol: 0,
      endCol: Math.min(visibleCols, this.config.maxRenderColumns)
    };
  }

  private draw(): void {
    if (!this.ctx) return;

    const ctx = this.ctx;
    ctx.fillStyle = this.config.backgroundColor;
    ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);

    this.drawHeader(ctx);
    this.drawCells(ctx);
    this.drawGrid(ctx);
  }

  private drawHeader(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.config.headerBackgroundColor;
    ctx.fillRect(0, 0, this.config.headerWidth, this.config.headerHeight);

    const headerRightEdge = this.getHeaderRightEdge();
    ctx.fillRect(this.config.headerWidth, 0, headerRightEdge - this.config.headerWidth, this.config.headerHeight);
    ctx.fillRect(0, this.config.headerHeight, this.config.headerWidth, this.displayHeight - this.config.headerHeight);

    ctx.fillStyle = this.config.textColor;
    ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let xPos = this.config.headerWidth;
    for (let col = this.viewport.startCol; col <= this.viewport.endCol; col++) {
      const cellWidth = this.getCellWidth(col);
      ctx.fillText(this.columnToLetter(col), xPos + cellWidth / 2, this.config.headerHeight / 2);
      xPos += cellWidth;
    }

    ctx.textAlign = 'right';
    for (let row = this.viewport.startRow; row <= this.viewport.endRow; row++) {
      const y = this.config.headerHeight + (row - this.viewport.startRow) * this.config.cellHeight * this.zoom + this.config.cellHeight * this.zoom / 2;
      ctx.fillText(String(row + 1), this.config.headerWidth - 4, y);
    }
  }

  private getHeaderRightEdge(): number {
    let width = this.config.headerWidth;
    for (let col = this.viewport.startCol; col <= this.viewport.endCol; col++) {
      width += this.getCellWidth(col);
    }
    return width;
  }

  private drawCells(ctx: CanvasRenderingContext2D): void {
    ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;

    let xPos = this.config.headerWidth;
    for (let col = this.viewport.startCol; col <= this.viewport.endCol; col++) {
      const cellWidth = this.getCellWidth(col);

      for (let row = this.viewport.startRow; row <= this.viewport.endRow; row++) {
        const cellData = this.cellCache[`${row}_${col}`];
        if (!cellData) continue;

        const y = this.config.headerHeight + (row - this.viewport.startRow) * this.config.cellHeight * this.zoom;

        const result = this.formatCellText(cellData);

        ctx.fillStyle = result.color || this.config.textColor;
        ctx.textBaseline = 'middle';

        if (cellData.isNumber() || isDateFormat(cellData.formatCode || '')) {
          ctx.textAlign = 'right';
          ctx.fillText(result.text, xPos + cellWidth - 4, y + this.config.cellHeight * this.zoom / 2);
        } else {
          ctx.textAlign = 'left';
          ctx.fillText(result.text, xPos + 4, y + this.config.cellHeight * this.zoom / 2);
        }
      }

      xPos += cellWidth;
    }
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = this.config.borderColor;
    ctx.lineWidth = 1 / this.dpr;

    const startX = this.config.headerWidth;
    const startY = this.config.headerHeight;

    ctx.beginPath();
    let xPos = startX;
    for (let col = this.viewport.startCol; col <= this.viewport.endCol + 1; col++) {
      ctx.moveTo(xPos, startY);
      ctx.lineTo(xPos, this.displayHeight);
      if (col <= this.viewport.endCol) {
        xPos += this.getCellWidth(col);
      }
    }
    ctx.stroke();

    ctx.beginPath();
    for (let row = this.viewport.startRow; row <= this.viewport.endRow + 1; row++) {
      const y = startY + (row - this.viewport.startRow) * this.config.cellHeight * this.zoom;
      ctx.moveTo(startX, y);
      ctx.lineTo(xPos, y);
    }
    ctx.stroke();
  }

  private setupScrollHandler(): void {
    if (!this.canvas) return;

    const self = this;
    this.canvas.addEventListener('wheel', function(e: WheelEvent) {
      e.preventDefault();

      const scrollAmount = Math.ceil(Math.abs(e.deltaY) / 50);
      const deltaY = e.deltaY > 0 ? scrollAmount : -scrollAmount;
      const deltaX = e.deltaX > 0 ? scrollAmount : -scrollAmount;

      const newRow = Math.max(0, Math.min(self.viewport.startRow + deltaY, self.maxRow - (self.viewport.endRow - self.viewport.startRow)));
      const newCol = Math.max(0, Math.min(self.viewport.startCol + deltaX, self.maxCol - (self.viewport.endCol - self.viewport.startCol)));

      if (newRow !== self.viewport.startRow || newCol !== self.viewport.startCol) {
        self.viewport.startRow = newRow;
        self.viewport.endRow = newRow + (self.viewport.endRow - self.viewport.startRow);
        self.viewport.startCol = newCol;
        self.viewport.endCol = newCol + (self.viewport.endCol - self.viewport.startCol);
        self.draw();
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

  resize(width: number, height: number): void {
    if (!this.canvas) return;

    this.displayWidth = width;
    this.displayHeight = height;
    this.canvas.width = Math.floor(width * this.dpr);
    this.canvas.height = Math.floor(height * this.dpr);
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';

    if (this.ctx) {
      this.ctx.scale(this.dpr, this.dpr);
    }

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
    this.columnWidths = {};
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

  private formatCellText(cellData: CellData): { text: string; color?: string } {
    if (cellData.isNumber()) {
      return formatCell(cellData.getNumberValue()!, cellData.formatCode);
    }

    if (cellData.isText()) {
      return { text: cellData.getTextValue() || '' };
    }

    if (cellData.isBoolean()) {
      return { text: cellData.getBooleanValue() ? 'TRUE' : 'FALSE' };
    }

    if (cellData.isDate()) {
      return formatCell(cellData.getDateValue()!, cellData.formatCode || 'm/d/yy');
    }

    return { text: '' };
  }
}
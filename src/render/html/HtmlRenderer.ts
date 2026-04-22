import { XlsbReader } from '../../api/XlsbReader';
import { CellData } from '../../core/cell/CellData';
import { CellType } from '../../core/cell/CellType';
import { HtmlConfig, defaultHtmlConfig } from './HtmlConfig';
import { defaultStyles, applyStyles } from './HtmlStyles';

export class HtmlRenderer {
  private config: HtmlConfig;
  private customStyles: Record<string, string> = {};

  constructor(config?: Partial<HtmlConfig>) {
    this.config = { ...defaultHtmlConfig, ...config };
  }

  render(reader: XlsbReader, sheetIndex: number, config?: Partial<HtmlConfig>): HTMLTableElement {
    const finalConfig = { ...this.config, ...config };
    const self = this;

    const table = document.createElement('table');
    table.className = `jsxlsb-table jsxlsb-theme-${finalConfig.theme}`;

    if (finalConfig.theme === 'dark') {
      applyStyles(table, { ...defaultStyles.table, ...defaultStyles.darkTheme.table });
    } else {
      applyStyles(table, defaultStyles.table);
    }

    const thead = document.createElement('thead');
    thead.className = 'jsxlsb-header';

    if (finalConfig.stickyHeader) {
      thead.style.position = 'sticky';
      thead.style.top = '0';
    }

    if (finalConfig.showHeader) {
      const headerRow = document.createElement('tr');
      headerRow.className = 'jsxlsb-header-row';

      const cornerCell = document.createElement('th');
      cornerCell.className = 'jsxlsb-corner-cell';
      applyStyles(cornerCell, defaultStyles.header);
      headerRow.appendChild(cornerCell);

      for (let col = 0; col < finalConfig.maxColumns; col++) {
        const colHeader = document.createElement('th');
        colHeader.className = 'jsxlsb-col-header';
        colHeader.textContent = self.columnToLetter(col);
        applyStyles(colHeader, defaultStyles.header);
        colHeader.style.width = `${finalConfig.cellWidth}px`;
        headerRow.appendChild(colHeader);
      }

      thead.appendChild(headerRow);
    }

    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    tbody.className = 'jsxlsb-body';

    let rowCount = 0;

    reader.forEachRow(sheetIndex, {
      onRowStart(rowIndex: number, columnCount: number) {
        if (rowCount >= finalConfig.maxRows) return;

        const tr = document.createElement('tr');
        tr.className = 'jsxlsb-row';
        tr.dataset.row = String(rowIndex);

        const rowHeader = document.createElement('td');
        rowHeader.className = 'jsxlsb-row-header';
        rowHeader.textContent = String(rowIndex + 1);
        applyStyles(rowHeader, defaultStyles.header);
        tr.appendChild(rowHeader);

        tbody.appendChild(tr);
      },
      onCell(row: number, col: number, cellData: CellData) {
        if (rowCount >= finalConfig.maxRows) return;
        if (col >= finalConfig.maxColumns) return;

        const rows = tbody.querySelectorAll('.jsxlsb-row');
        const tr = rows[rows.length - 1];
        if (!tr) return;

        const td = document.createElement('td');
        td.className = 'jsxlsb-cell';
        td.dataset.row = String(row);
        td.dataset.col = String(col);

        applyStyles(td, defaultStyles.cell);

        if (cellData.isNumber()) {
          applyStyles(td, defaultStyles.numberCell);
          td.textContent = self.formatNumber(cellData.getNumberValue()!, cellData.formatCode);
        } else if (cellData.isText()) {
          td.textContent = cellData.getTextValue() || '';
        } else if (cellData.isBoolean()) {
          td.textContent = cellData.getBooleanValue() ? 'TRUE' : 'FALSE';
        } else if (cellData.isDate()) {
          const timestamp = cellData.getDateValue()!;
          const date = new Date(timestamp);
          td.textContent = date.toLocaleDateString();
        } else {
          td.textContent = '';
        }

        td.style.width = `${finalConfig.cellWidth}px`;
        tr.appendChild(td);
      },
      onRowEnd(rowIndex: number) {
        rowCount++;
      }
    });

    table.appendChild(tbody);

    return table;
  }

  renderTo(container: HTMLElement, reader: XlsbReader, sheetIndex: number, config?: Partial<HtmlConfig>): void {
    const table = this.render(reader, sheetIndex, config);
    container.appendChild(table);
  }

  setStyles(styles: Record<string, string>): void {
    this.customStyles = styles;
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

  private formatNumber(value: number, formatCode?: string): string {
    if (!formatCode || formatCode === 'General') {
      return String(value);
    }

    if (formatCode.endsWith('%')) {
      const percentValue = value * 100;
      const decimals = this.getDecimals(formatCode);
      return percentValue.toFixed(decimals) + '%';
    }

    if (formatCode.includes('#,##0') || formatCode.includes('#,#')) {
      const decimals = this.getDecimals(formatCode);
      if (formatCode.startsWith('￥') || formatCode.startsWith('$') || formatCode.startsWith('¥')) {
        const symbol = formatCode.charAt(0);
        return symbol + value.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      }
      return value.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }

    if (formatCode.match(/^[0]+\.?[0]*$/)) {
      const decimals = this.getDecimals(formatCode);
      return value.toFixed(decimals);
    }

    if (formatCode.includes('E+')) {
      return value.toExponential(2);
    }

    return String(value);
  }

  private getDecimals(formatCode: string): number {
    const match = formatCode.match(/\.([0]+)/);
    if (match) {
      return match[1].length;
    }
    if (formatCode.includes('.') && !formatCode.includes('%')) {
      return 2;
    }
    if (formatCode.endsWith('%') && formatCode.includes('.')) {
      const percentMatch = formatCode.match(/\.([0]+)%/);
      if (percentMatch) {
        return percentMatch[1].length;
      }
    }
    return 0;
  }
}
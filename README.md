# jsxlsb

[中文文档](README_cn.md) | **English**

A pure JavaScript library for reading and writing XLSB (Excel Binary Workbook) files.

## Features

- **Pure JavaScript** - No external dependencies (pako bundled for ZIP compression)
- **High Performance** - BIFF12 binary format, smaller files and faster I/O
- **Cross Platform** - Works in both Node.js and browser environments
- **Full Functionality** - Read, write, and render capabilities
- **High DPI Support** - Canvas renderer supports retina displays
- **Auto Column Width** - Automatically calculates column widths based on content

## Installation

```bash
npm install jsxlsb
```

Or build from source:

```bash
git clone https://github.com/itcraft-cn/jsxlsb.git
cd jsxlsb
npm install
npm run build
```

## Quick Start

### Node.js - Reading

```javascript
const { XlsbReader } = require('jsxlsb');

const reader = XlsbReader.builder().path('./data.xlsb').build();

// Get sheet information
const sheets = reader.getSheetInfos();
console.log('Sheets:', sheets);

// Stream reading
reader.forEachRow(0, {
  onRowStart(row, colCount) { console.log(`Row ${row} start`); },
  onCell(row, col, cell) {
    console.log(`  ${row},${col}: ${cell.value}, format: ${cell.formatCode}`);
  },
  onRowEnd(row) { console.log(`Row ${row} end`); }
});

// Batch reading
const batch = reader.readRows(0, 100, 1000);  // Read 1000 rows starting from row 100

reader.close();
```

### Node.js - Writing

```javascript
const { XlsbWriter, CellData } = require('jsxlsb');

const writer = XlsbWriter.builder().path('./output.xlsb').build();

const data = [
  [CellData.text('Name'), CellData.text('Age'), CellData.text('Salary')],
  [CellData.text('John'), CellData.number(25), CellData.currency(5000)],
  [CellData.text('Jane'), CellData.number(30), CellData.percentage(0.15)],
];

writer.writeBatch('Employees', data);
writer.close();

console.log('XLSB file created: output.xlsb');
```

### Browser - Rendering

```html
<script src="jsxlsb.js"></script>
<script>
  const reader = await jsxlsb.XlsbReader.fromFile(file);

  // HTML Table Renderer
  const htmlRenderer = new jsxlsb.HtmlRenderer();
  const table = htmlRenderer.render(reader, 0, {
    maxRows: 500,
    maxColumns: 20,
    theme: 'light',
    stickyHeader: true
  });
  document.getElementById('container').appendChild(table);

  // Canvas Renderer (High DPI + Auto Column Width)
  const canvas = document.getElementById('canvas');
  const canvasRenderer = new jsxlsb.CanvasRenderer();
  canvasRenderer.render(canvas, reader, 0);

  reader.close();
</script>
```

## API Reference

### CellData

```javascript
CellData.text('text')           // Text cell
CellData.number(123.45)         // Number cell
CellData.number(value, formatCode)  // Number with format
CellData.date(timestamp)        // Date cell (Excel date format)
CellData.bool(true)             // Boolean cell
CellData.blank()                // Blank cell

// Built-in formats
CellData.percentage(0.15)           // 15.00%
CellData.percentage(0.15, 3)        // 15.000%
CellData.numberWithComma(1234567)   // 1,234,567.00
CellData.numberNegativeRed(-500)    // -500.00 (red)
CellData.currency(5000)             // ￥5,000.00
CellData.currency(5000, '$')        // $5,000.00
CellData.time(timestamp)            // h:mm:ss
```

### XlsbReader

```javascript
// Node.js
const reader = XlsbReader.builder().path('./data.xlsb').build();
const reader = XlsbReader.builder().buffer(uint8Array).build();

// Browser
const reader = await XlsbReader.fromFile(file);

// Methods
reader.getSheetInfos();           // Returns array of sheet info
reader.forEachRow(sheetIndex, handler);  // Stream reading
reader.readRows(sheetIndex, startRow, batchSize);  // Batch reading
reader.getStyles();               // Returns StylesReader
reader.close();
```

### XlsbWriter

```javascript
const writer = XlsbWriter.builder().path('./output.xlsb').build();
const writer = XlsbWriter.builder().buffer().build();  // Returns Uint8Array

writer.writeBatch(sheetName, data);  // Write entire sheet
writer.startSheet(sheetName, columnCount);  // Start streaming write
writer.writeRows(data);              // Append rows
writer.endSheet();                   // End sheet
writer.close();                      // Finalize and return Uint8Array (if buffer mode)
```

### HtmlRenderer

```javascript
const renderer = new HtmlRenderer(config);

const table = renderer.render(reader, sheetIndex, {
  maxRows: 500,
  maxColumns: 20,
  theme: 'light',      // 'light' or 'dark'
  stickyHeader: true,
  showHeader: true,
  cellWidth: 100
});

renderer.renderTo(container, reader, sheetIndex, config);  // Direct append to DOM
```

### CanvasRenderer

```javascript
const renderer = new CanvasRenderer(config);

renderer.render(canvas, reader, sheetIndex, {
  cellHeight: 24,
  fontFamily: 'Arial',
  fontSize: 12,
  maxRenderRows: 50,
  maxRenderColumns: 20
});

renderer.setZoom(1.5);           // Set zoom level (0.5 - 3)
renderer.scrollTo(row, col);     // Scroll to position
renderer.resize(width, height);  // Resize canvas
renderer.destroy();              // Clean up
```

### Format Utilities

```javascript
const { formatCell, isDateFormat, excelDateToTimestamp } = require('jsxlsb');

// Format a cell value
const result = formatCell(-500, '#,##0.00;[Red]-#,##0.00');
// Returns: { text: '-500.00', color: 'red' }

// Check if format is date/time
isDateFormat('m/d/yy h:mm');  // true

// Convert Excel date to timestamp
excelDateToTimestamp(46131.401);  // Returns JavaScript timestamp
```

## Format Support

### Number Formats

| Format Code | Example |
|-------------|---------|
| `General` | 123.45 |
| `#,##0.00` | 1,234.56 |
| `#,##0.00;[Red]-#,##0.00` | -500.00 (red) |
| `￥#,##0.00` | ￥1,234.56 |
| `0.00%` | 15.00% |

### Date/Time Formats

| Format Code | Example |
|-------------|---------|
| `m/d/yy` | 4/20/26 |
| `m/d/yy h:mm` | 4/20/26 17:04 |
| `h:mm:ss` | 17:04:35 |

## Examples

See the `examples/` directory:

- `node-read.js` - Node.js reading example
- `node-write.js` - Node.js writing example
- `browser-canvas.html` - Canvas renderer demo
- `browser-html.html` - HTML renderer demo
- `browser-test.html` - Comprehensive browser test

## Building

```bash
npm run build       # Build UMD bundle
npm run build:watch # Watch mode
npm run typecheck   # Type checking
```

## License

Apache License 2.0

## Related

- [jxlsb](https://github.com/itcraft-cn/jxlsb) - Java version of this library
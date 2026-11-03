[中文](MANUAL.md) | **English**

# jsxlsb Manual

> This manual is for developers using jsxlsb. It covers installation, build, Node.js and browser usage, renderers and examples.
> For a feature overview see [README_en.md](README_en.md); for version history see [CHANGELOG_en.md](CHANGELOG_en.md).

## 1. Introduction

jsxlsb is a pure JavaScript XLSB (Excel Binary Workbook) reader/writer library that runs in both Node.js and the browser. Its fixed starting point is high-performance data output; reading was initially meant only for consuming templates, and high-performance reading followed naturally together with HTML/Canvas rendering.

## 2. Requirements

| Environment | Requirement |
|-------------|-------------|
| Node.js | 14+ |
| Browser | Chrome / Firefox / Safari / Edge (modern versions) |
| Dependency | pako (bundled into the UMD build) |

## 3. Installation & Build

```bash
npm install jsxlsb          # install from npm
# or build from source
git clone https://github.com/itcraft-cn/jsxlsb.git
cd jsxlsb && npm install && npm run build
```

Build commands:

```bash
npm run build        # build UMD bundle (dist/jsxlsb.js)
npm run build:watch  # watch mode
npm run typecheck    # type checking
```

## 4. Node.js Usage

### 4.1 Reading

```javascript
const { XlsbReader } = require('jsxlsb');
const reader = XlsbReader.builder().path('./data.xlsb').build();

const sheets = reader.getSheetInfos();

// Streaming read
reader.forEachRow(0, {
  onRowStart(row, colCount) { /* ... */ },
  onCell(row, col, cell) { console.log(`${row},${col}: ${cell.value}`); },
  onRowEnd(row) { /* ... */ }
});

// Batch read
const batch = reader.readRows(0, 100, 1000);

reader.close();
```

### 4.2 Writing

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
```

### 4.3 Row/Column Limits and Compression

```javascript
const { XlsbWriter, OverflowBehavior, setOverflow } = require('jsxlsb');

// Cut on column overflow, error on row overflow (global, snapshotted per write)
setOverflow(OverflowBehavior.Cut, OverflowBehavior.Error);

const writer = XlsbWriter.builder()
  .path('./output.xlsb')
  .compressionLevel(6)   // 0=store, 1-9=deflate; default 1
  .build();
```

- Limits: `MAX_COLUMNS = 16384`, `MAX_ROWS = 1048576`
- `Error` throws `LimitExceededError`; `Cut` silently truncates
- Batch writes, streaming writes and template filling share the same policy

## 5. Browser Usage

```html
<script src="jsxlsb.js"></script>
<script>
  const reader = await jsxlsb.XlsbReader.fromFile(file);

  // HTML table rendering
  const htmlRenderer = new jsxlsb.HtmlRenderer();
  document.getElementById('container')
    .appendChild(htmlRenderer.render(reader, 0, { maxRows: 500, theme: 'light', stickyHeader: true }));

  // Canvas rendering (high DPI + auto column width)
  const canvasRenderer = new jsxlsb.CanvasRenderer();
  canvasRenderer.render(document.getElementById('canvas'), reader, 0);

  reader.close();
</script>
```

## 6. API Overview

### CellData

```javascript
CellData.text('text')               // Text
CellData.number(123.45)             // Number
CellData.number(value, formatCode)  // Number with format
CellData.date(timestamp)            // Date
CellData.bool(true)                 // Boolean
CellData.blank()                    // Blank

CellData.percentage(0.15)           // 15.00%
CellData.numberWithComma(1234567)   // 1,234,567.00
CellData.numberNegativeRed(-500)    // -500.00 (red)
CellData.currency(5000)             // ￥5,000.00
CellData.time(timestamp)            // h:mm:ss
```

### XlsbWriter

```javascript
writer.writeBatch(sheetName, data);            // write entire worksheet
writer.startSheet(sheetName, columnCount);     // start streaming write
writer.writeRows(data);                        // append rows
writer.endSheet();                             // end sheet
writer.close();                                // finalize (returns Uint8Array in buffer mode)
```

### Format Utilities

```javascript
const { formatCell, isDateFormat, excelDateToTimestamp } = require('jsxlsb');
formatCell(-500, '#,##0.00;[Red]-#,##0.00');  // { text: '-500.00', color: 'red' }
isDateFormat('m/d/yy h:mm');                  // true
excelDateToTimestamp(46131.401);              // JS timestamp
```

## 7. Format Support

| Type | Format Code | Example |
|------|-------------|---------|
| General | `General` | 123.45 |
| Thousand separator | `#,##0.00` | 1,234.56 |
| Negative red | `#,##0.00;[Red]-#,##0.00` | -500.00 (red) |
| Currency | `￥#,##0.00` | ￥1,234.56 |
| Percentage | `0.00%` | 15.00% |
| Date | `m/d/yy` | 4/20/26 |
| Date-time | `m/d/yy h:mm` | 4/20/26 17:04 |
| Time | `h:mm:ss` | 17:04:35 |

## 8. Limitations

- Template filling is partially supported; the style system is mostly read-only
- Formula and chart support is not available yet

## 9. Further Docs

- [README_en.md](README_en.md) — feature overview
- [CHANGELOG_en.md](CHANGELOG_en.md) — version history
- `examples/` — runnable examples
- `test/` — test suite

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-04-22

### Added

- Initial release of jsxlsb library
- **XlsbReader** - Read XLSB files with stream and batch APIs
  - `forEachRow()` - Stream reading with row/cell callbacks
  - `readRows()` - Batch reading for pagination
  - `getSheetInfos()` - Get worksheet information
  - `fromFile()` - Browser File API support
- **XlsbWriter** - Write XLSB files
  - `writeBatch()` - Write entire worksheet
  - `startSheet()/writeRows()/endSheet()` - Streaming write API
  - Support for CellData types: text, number, date, boolean, blank
- **HtmlRenderer** - HTML table rendering
  - Light/Dark theme support
  - Sticky header option
  - Configurable max rows/columns
  - Cell width customization
- **CanvasRenderer** - Canvas rendering with virtual scroll
  - Mouse wheel scrolling
  - Zoom support (0.5x - 3x)
  - `scrollTo()` navigation
  - `resize()` dynamic canvas sizing
- **High DPI Support** - Canvas renderer supports retina displays
  - Uses `devicePixelRatio` for sharp rendering
  - Automatically scales for high resolution screens
- **Auto Column Width** - Canvas columns auto-adjust based on content
  - Minimum width: 40px
  - Maximum width: 200px
  - Text measurement for optimal display
- **Number Format Support**
  - Currency format (`￥#,##0.00`, `$#,##0.00`)
  - Percentage format (`0.00%`)
  - Thousand separator (`#,##0.00`)
  - Negative-red format (`#,##0.00;[Red]-#,##0.00`)
- **Date/Time Format Support**
  - Excel date conversion (46131.xxx → date)
  - Format patterns: `m/d/yy`, `m/d/yy h:mm`, `h:mm:ss`
  - Automatic date format detection
- **StylesReader/StylesWriter** - Parse and write style information
  - Read format codes from `xl/styles.bin`
  - Write custom formats with proper styleIndex
  - Built-in format code mapping
- **FormatUtils** - Formatting utilities
  - `formatCell(value, formatCode)` - Format any value
  - `isDateFormat(formatCode)` - Check if format is date/time
  - Returns `{ text, color }` for rendering
- **DateUtils** - Date conversion utilities
  - `excelDateToTimestamp()` - Convert Excel date to JS timestamp
  - `timestampToExcelDate()` - Convert JS timestamp to Excel date
- **BIFF12 Implementation**
  - Biff12Writer/Biff12Reader - Record encoding/decoding
  - VarInt encoding support
  - All cell record types (Rk, Real, Isst, Bool, Blank)
- **ZIP Container**
  - ZipWriter/ZipReader - XLSB container handling
  - Uses pako library for deflate/inflate
  - Data Descriptor mode support
- **Shared Strings Table**
  - SST loading and writing
  - UTF-16LE string encoding
- **Examples**
  - `node-read.js` - Node.js reading example
  - `node-write.js` - Node.js writing example  
  - `browser-canvas.html` - Canvas renderer demo
  - `browser-html.html` - HTML renderer demo
  - `browser-test.html` - Comprehensive browser test
  - `demo_template.xlsb` - Template from jxlsb Java version

### Fixed

- ZIP format compatibility with Java-generated XLSB files
- Central directory offset calculation in ZipWriter
- StyleIndex parsing from cell records (bytes 4-6)
- Consistent styleId return from StylesWriter.addDateFormat()
- Proper format code reading from styles.bin

### Dependencies

- pako ^2.1.0 - ZIP compression/decompression

### Platform Support

- Node.js 14+ 
- Modern browsers (Chrome, Firefox, Safari, Edge)

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-04-22 | Initial release with read/write/render |

---

## Future Plans

- [ ] Template filling (`fillBatch`, `fillAtMarker`)
- [ ] Style system expansion (fonts, borders, fills)
- [ ] Formula support
- [ ] Chart rendering
- [ ] Streaming write for large datasets
- [ ] Worker thread support for heavy operations
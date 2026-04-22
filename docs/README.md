# jsxlsb - JavaScript XLSB Library

一个纯 JavaScript 实现的 XLSB (Excel Binary Workbook) 格式读写库。

## 特性

- **零依赖**: 纯 JavaScript 实现，无需任何外部库
- **高性能**: 基于 BIFF12 二进制格式，文件更小、读写更快
- **跨平台**: 同时支持 Node.js 和浏览器环境
- **完整功能**: 支持读写、渲染展示

## 当前状态

- **读取功能**: ✅ 完全可用 - 可读取 Java 版本生成的 XLSB 文件
- **写入功能**: 🚧 开发中 - ZIP 格式需进一步完善
- **渲染功能**: ✅ HTML/Canvas 渲染可用

## 安装

```bash
npm install
npm run build
```

## 快速开始

### Node.js 读取

```javascript
const { XlsbReader } = require('./dist/jsxlsb.js');

const reader = XlsbReader.builder().path('./data.xlsb').build();

// 流式读取
reader.forEachRow(0, {
  onRowStart(row, colCount) { console.log(`Row ${row} start`); },
  onCell(row, col, cell) { console.log(`  ${row},${col}: ${cell.value}`); },
  onRowEnd(row) { console.log(`Row ${row} end`); }
});

// 分页读取
const batch = reader.readRows(0, 100, 1000);  // 从100行开始，读取1000行

reader.close();
```

### Node.js 写入

```javascript
const { XlsbWriter, CellData } = require('./dist/jsxlsb.js');

const writer = XlsbWriter.builder().path('./output.xlsb').build();

const data = [
  [CellData.text('姓名'), CellData.text('年龄'), CellData.text('工资')],
  [CellData.text('张三'), CellData.number(25), CellData.currency(5000)],
];
writer.writeBatch('员工表', data);

writer.close();
```

### 浏览器渲染

```html
<script src="jsxlsb.js"></script>
<script>
  const reader = await jsxlsb.XlsbReader.fromFile(file);

  // HTML 表格渲染
  const renderer = new jsxlsb.HtmlRenderer();
  const table = renderer.render(reader, 0, { maxRows: 500 });
  document.getElementById('container').appendChild(table);

  // Canvas 渲染
  const canvasRenderer = new jsxlsb.CanvasRenderer();
  canvasRenderer.render(canvas, reader, 0);

  reader.close();
</script>
```

## API 参考

### CellData

```javascript
CellData.text('文本')
CellData.number(123.45)
CellData.date(timestamp)
CellData.bool(true)
CellData.blank()

// 内置格式
CellData.percentage(0.15)      // 15.00%
CellData.numberWithComma(1234567)  // #,##0.00
CellData.currency(5000)        // ￥5,000.00
```

### XlsbReader

```javascript
const reader = XlsbReader.builder().path('./data.xlsb').build();

reader.getSheetInfos();        // 获取 Sheet 信息
reader.forEachRow(0, handler); // 流式读取
reader.readRows(0, start, batch); // 分页读取

reader.close();

// 浏览器
const reader = await XlsbReader.fromFile(file);
```

## 许可证

Apache License 2.0
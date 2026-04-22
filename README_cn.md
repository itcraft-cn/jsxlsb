# jsxlsb

纯 JavaScript 实现的 XLSB (Excel Binary Workbook) 格式读写库。

[English Documentation](README.md)

## 特性

- **纯 JavaScript** - 无外部依赖（pako 打包用于 ZIP 压缩）
- **高性能** - 基于 BIFF12 二进制格式，文件更小、读写更快
- **跨平台** - 同时支持 Node.js 和浏览器环境
- **完整功能** - 支持读写、渲染展示
- **高 DPI 支持** - Canvas 渲染支持 Retina 显示屏
- **自动列宽** - 根据内容自动计算列宽

## 安装

```bash
npm install jsxlsb
```

或从源码构建：

```bash
git clone https://github.com/itcraft-cn/jsxlsb.git
cd jsxlsb
npm install
npm run build
```

## 快速开始

### Node.js - 读取

```javascript
const { XlsbReader } = require('jsxlsb');

const reader = XlsbReader.builder().path('./data.xlsb').build();

// 获取 Sheet 信息
const sheets = reader.getSheetInfos();
console.log('工作表:', sheets);

// 流式读取
reader.forEachRow(0, {
  onRowStart(row, colCount) { console.log(`行 ${row} 开始`); },
  onCell(row, col, cell) {
    console.log(`  ${row},${col}: ${cell.value}, 格式: ${cell.formatCode}`);
  },
  onRowEnd(row) { console.log(`行 ${row} 结束`); }
});

// 分页读取
const batch = reader.readRows(0, 100, 1000);  // 从100行开始，读取1000行

reader.close();
```

### Node.js - 写入

```javascript
const { XlsbWriter, CellData } = require('jsxlsb');

const writer = XlsbWriter.builder().path('./output.xlsb').build();

const data = [
  [CellData.text('姓名'), CellData.text('年龄'), CellData.text('工资')],
  [CellData.text('张三'), CellData.number(25), CellData.currency(5000)],
  [CellData.text('李四'), CellData.number(30), CellData.percentage(0.15)],
];

writer.writeBatch('员工表', data);
writer.close();

console.log('XLSB 文件创建成功: output.xlsb');
```

### 浏览器 - 渲染

```html
<script src="jsxlsb.js"></script>
<script>
  const reader = await jsxlsb.XlsbReader.fromFile(file);

  // HTML 表格渲染
  const htmlRenderer = new jsxlsb.HtmlRenderer();
  const table = htmlRenderer.render(reader, 0, {
    maxRows: 500,
    maxColumns: 20,
    theme: 'light',
    stickyHeader: true
  });
  document.getElementById('container').appendChild(table);

  // Canvas 渲染（高 DPI + 自动列宽）
  const canvas = document.getElementById('canvas');
  const canvasRenderer = new jsxlsb.CanvasRenderer();
  canvasRenderer.render(canvas, reader, 0);

  reader.close();
</script>
```

## API 参考

### CellData

```javascript
CellData.text('文本')           // 文本单元格
CellData.number(123.45)         // 数值单元格
CellData.number(value, formatCode)  // 带格式的数值
CellData.date(timestamp)        // 日期单元格（Excel 日期格式）
CellData.bool(true)             // 布尔单元格
CellData.blank()                // 空白单元格

// 内置格式
CellData.percentage(0.15)           // 15.00%
CellData.percentage(0.15, 3)        // 15.000%
CellData.numberWithComma(1234567)   // 1,234,567.00
CellData.numberNegativeRed(-500)    // -500.00（红色）
CellData.currency(5000)             // ￥5,000.00
CellData.currency(5000, '$')        // $5,000.00
CellData.time(timestamp)            // h:mm:ss
```

### XlsbReader

```javascript
// Node.js
const reader = XlsbReader.builder().path('./data.xlsb').build();
const reader = XlsbReader.builder().buffer(uint8Array).build();

// 浏览器
const reader = await XlsbReader.fromFile(file);

// 方法
reader.getSheetInfos();           // 返回工作表信息数组
reader.forEachRow(sheetIndex, handler);  // 流式读取
reader.readRows(sheetIndex, startRow, batchSize);  // 分页读取
reader.getStyles();               // 返回 StylesReader
reader.close();
```

### XlsbWriter

```javascript
const writer = XlsbWriter.builder().path('./output.xlsb').build();
const writer = XlsbWriter.builder().buffer().build();  // 返回 Uint8Array

writer.writeBatch(sheetName, data);  // 写入整个工作表
writer.startSheet(sheetName, columnCount);  // 开始流式写入
writer.writeRows(data);              //追加行
writer.endSheet();                   // 结束工作表
writer.close();                      // 完成并返回 Uint8Array（如果是 buffer 模式）
```

### HtmlRenderer

```javascript
const renderer = new HtmlRenderer(config);

const table = renderer.render(reader, sheetIndex, {
  maxRows: 500,
  maxColumns: 20,
  theme: 'light',      // 'light' 或 'dark'
  stickyHeader: true,
  showHeader: true,
  cellWidth: 100
});

renderer.renderTo(container, reader, sheetIndex, config);  // 直接添加到 DOM
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

renderer.setZoom(1.5);           // 设置缩放级别（0.5 - 3）
renderer.scrollTo(row, col);     // 滚动到指定位置
renderer.resize(width, height);  // 调整 Canvas 尺寸
renderer.destroy();              // 清理资源
```

### 格式化工具

```javascript
const { formatCell, isDateFormat, excelDateToTimestamp } = require('jsxlsb');

// 格式化单元格值
const result = formatCell(-500, '#,##0.00;[Red]-#,##0.00');
// 返回: { text: '-500.00', color: 'red' }

// 检查是否为日期/时间格式
isDateFormat('m/d/yy h:mm');  // true

// 转换 Excel 日期为时间戳
excelDateToTimestamp(46131.401);  // 返回 JavaScript 时间戳
```

## 格式支持

### 数字格式

| 格式代码 | 示例 |
|---------|------|
| `General` | 123.45 |
| `#,##0.00` | 1,234.56 |
| `#,##0.00;[Red]-#,##0.00` | -500.00（红色） |
| `￥#,##0.00` | ￥1,234.56 |
| `0.00%` | 15.00% |

### 日期/时间格式

| 格式代码 | 示例 |
|---------|------|
| `m/d/yy` | 4/20/26 |
| `m/d/yy h:mm` | 4/20/26 17:04 |
| `h:mm:ss` | 17:04:35 |

## 示例

参见 `examples/` 目录：

- `node-read.js` - Node.js 读取示例
- `node-write.js` - Node.js 写入示例
- `browser-canvas.html` - Canvas 渲染演示
- `browser-html.html` - HTML 渲染演示
- `browser-test.html` - 综合浏览器测试

## 构建

```bash
npm run build       # 构建 UMD 包
npm run build:watch # 监听模式
npm run typecheck   # 类型检查
```

## 许可证

Apache License 2.0

## 相关项目

- [jxlsb](https://github.com/itcraft-cn/jxlsb) - 本库的 Java 版本
**中文** | [English](MANUAL_en.md)

# jsxlsb 使用手册

> 本手册面向使用 jsxlsb 的开发者，覆盖安装、构建、Node.js 与浏览器用法、渲染器与示例。
> 特性概览见 [README.md](README.md)，版本历史见 [CHANGELOG.md](CHANGELOG.md)。

## 1. 简介

jsxlsb 是纯 JavaScript 实现的 XLSB（Excel Binary Workbook）读写库，同时支持 Node.js 与浏览器。设计出发点为高性能数据输出；读取最初用于读模板，读能力完备后自然延伸出高性能读，并提供 HTML/Canvas 渲染。

## 2. 环境要求

| 环境 | 要求 |
|------|------|
| Node.js | 14+ |
| 浏览器 | Chrome / Firefox / Safari / Edge（现代版本） |
| 依赖 | pako（已打包进 UMD 产物） |

## 3. 安装与构建

```bash
npm install jsxlsb          # 从 npm 安装
# 或从源码构建
git clone https://github.com/itcraft-cn/jsxlsb.git
cd jsxlsb && npm install && npm run build
```

构建命令：

```bash
npm run build        # 构建 UMD 包（dist/jsxlsb.js）
npm run build:watch  # 监听模式
npm run typecheck    # 类型检查
```

## 4. Node.js 用法

### 4.1 读取

```javascript
const { XlsbReader } = require('jsxlsb');
const reader = XlsbReader.builder().path('./data.xlsb').build();

const sheets = reader.getSheetInfos();

// 流式读取
reader.forEachRow(0, {
  onRowStart(row, colCount) { /* ... */ },
  onCell(row, col, cell) { console.log(`${row},${col}: ${cell.value}`); },
  onRowEnd(row) { /* ... */ }
});

// 分页读取
const batch = reader.readRows(0, 100, 1000);

reader.close();
```

### 4.2 写入

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

## 5. 浏览器用法

```html
<script src="jsxlsb.js"></script>
<script>
  const reader = await jsxlsb.XlsbReader.fromFile(file);

  // HTML 表格渲染
  const htmlRenderer = new jsxlsb.HtmlRenderer();
  document.getElementById('container')
    .appendChild(htmlRenderer.render(reader, 0, { maxRows: 500, theme: 'light', stickyHeader: true }));

  // Canvas 渲染（高 DPI + 自动列宽）
  const canvasRenderer = new jsxlsb.CanvasRenderer();
  canvasRenderer.render(document.getElementById('canvas'), reader, 0);

  reader.close();
</script>
```

## 6. API 速览

### CellData

```javascript
CellData.text('text')               // 文本
CellData.number(123.45)             // 数字
CellData.number(value, formatCode)  // 带格式数字
CellData.date(timestamp)            // 日期
CellData.bool(true)                 // 布尔
CellData.blank()                    // 空白

CellData.percentage(0.15)           // 15.00%
CellData.numberWithComma(1234567)   // 1,234,567.00
CellData.numberNegativeRed(-500)    // -500.00（红）
CellData.currency(5000)             // ￥5,000.00
CellData.time(timestamp)            // h:mm:ss
```

### XlsbWriter

```javascript
writer.writeBatch(sheetName, data);            // 写入整张工作表
writer.startSheet(sheetName, columnCount);     // 开始流式写入
writer.writeRows(data);                        // 追加行
writer.endSheet();                             // 结束工作表
writer.close();                                // 完成（buffer 模式返回 Uint8Array）
```

### 格式化工具

```javascript
const { formatCell, isDateFormat, excelDateToTimestamp } = require('jsxlsb');
formatCell(-500, '#,##0.00;[Red]-#,##0.00');  // { text: '-500.00', color: 'red' }
isDateFormat('m/d/yy h:mm');                  // true
excelDateToTimestamp(46131.401);              // JS 时间戳
```

## 7. 格式支持

| 类型 | 格式代码 | 示例 |
|------|----------|------|
| 通用 | `General` | 123.45 |
| 千分位 | `#,##0.00` | 1,234.56 |
| 负数标红 | `#,##0.00;[Red]-#,##0.00` | -500.00（红） |
| 货币 | `￥#,##0.00` | ￥1,234.56 |
| 百分比 | `0.00%` | 15.00% |
| 日期 | `m/d/yy` | 4/20/26 |
| 日期时间 | `m/d/yy h:mm` | 4/20/26 17:04 |
| 时间 | `h:mm:ss` | 17:04:35 |

## 8. 限制

- 模板填充为部分支持，样式系统以只读为主
- 暂不支持公式、图表

## 9. 更多文档

- [README.md](README.md) — 特性概览
- [CHANGELOG.md](CHANGELOG.md) — 版本历史
- `examples/` — 可运行示例
- `test/` — 测试套件

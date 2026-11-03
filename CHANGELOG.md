**中文** | [English](CHANGELOG_en.md)

# 变更日志

本项目所有值得注意的变更都记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

### 新增

- 完整实现模板填充功能（`fillBatch`、`fillAtMarker`、模板模式）
- Node.js 综合功能测试
- 100K 行性能基准测试
- **行列上限溢出策略**（与 rxlsb 对齐）：`MAX_COLUMNS = 16384`、`MAX_ROWS = 1048576`；
  `setColumnOverflow/setRowOverflow/setOverflow`，`OverflowBehavior.{Error, Cut}`，
  超限抛 `LimitExceededError` 或截断；每次写入通过 `SheetLimits` 快照
- 写入器压缩级别可配置：`XlsbWriterOptions.compressionLevel` / `ZipWriter.setCompressionLevel`，默认 **1**

### 修复

- 模板模式下将模板工作表加入 `workbookWriter`
- 空白单元格不再写入 `BrtCellBlank`，避免文件膨胀
- 流式写入的 `BrtWsDim.last_row` 改为前导占位、结束时回填（同时修正列数被写成 0 的问题）
- RK 编码改为标准整数形式 `(n << 2) | 0x02`；`decodeRk` 标志位对齐 MS-XLSB（bit1=fInt，bit0=fX100）
- 模板填充统一受行列上限约束（维度裁剪、超限单元格/填充列跳过）
- SST UTF-16 解码改为一次边界检查 + 分块批量构造字符串

### 变更

- 文档：新增「设计定位」章节
- 版本：进入 1.1.0-dev

## [1.0.0] - 2026-04-22

### 新增

- jsxlsb 库首次发布
- **XlsbReader** — 以流式与批量 API 读取 XLSB 文件
  - `forEachRow()` — 带行/单元格回调的流式读取
  - `readRows()` — 用于分页的批量读取
  - `getSheetInfos()` — 获取工作表信息
  - `fromFile()` — 浏览器 File API 支持
- **XlsbWriter** — 写入 XLSB 文件
  - `writeBatch()` — 写入整张工作表
  - `startSheet()/writeRows()/endSheet()` — 流式写入 API
  - 支持 CellData 类型：文本、数字、日期、布尔、空白
- **HtmlRenderer** — HTML 表格渲染
  - 亮/暗主题支持
  - 粘性表头选项
  - 可配置最大行数/列数
  - 单元格宽度自定义
- **CanvasRenderer** — 带虚拟滚动的 Canvas 渲染
  - 鼠标滚轮滚动
  - 缩放支持（0.5x - 3x）
  - `scrollTo()` 导航
  - `resize()` 动态调整画布尺寸
- **高 DPI 支持** — Canvas 渲染支持 Retina 显示屏
  - 使用 `devicePixelRatio` 实现清晰渲染
  - 自动适配高分辨率屏幕
- **自动列宽** — Canvas 列宽根据内容自动调整
  - 最小宽度：40px
  - 最大宽度：200px
  - 文本测量以获得最佳显示
- **数字格式支持**
  - 货币格式（`￥#,##0.00`、`$#,##0.00`）
  - 百分比格式（`0.00%`）
  - 千分位（`#,##0.00`）
  - 负数标红（`#,##0.00;[Red]-#,##0.00`）
- **日期/时间格式支持**
  - Excel 日期转换（46131.xxx → 日期）
  - 格式模式：`m/d/yy`、`m/d/yy h:mm`、`h:mm:ss`
  - 自动日期格式识别
- **StylesReader/StylesWriter** — 解析与写入样式信息
  - 从 `xl/styles.bin` 读取格式代码
  - 以正确的 styleIndex 写入自定义格式
  - 内置格式代码映射
- **FormatUtils** — 格式化工具
  - `formatCell(value, formatCode)` — 格式化任意值
  - `isDateFormat(formatCode)` — 判断是否为日期/时间格式
  - 返回 `{ text, color }` 供渲染使用
- **DateUtils** — 日期转换工具
  - `excelDateToTimestamp()` — Excel 日期转 JS 时间戳
  - `timestampToExcelDate()` — JS 时间戳转 Excel 日期
- **BIFF12 实现**
  - Biff12Writer/Biff12Reader — 记录编解码
  - VarInt 编码支持
  - 全部单元格记录类型（Rk、Real、Isst、Bool、Blank）
- **ZIP 容器**
  - ZipWriter/ZipReader — XLSB 容器处理
  - 使用 pako 库进行 deflate/inflate
  - Data Descriptor 模式支持
- **共享字符串表**
  - SST 加载与写入
  - UTF-16LE 字符串编码
- **示例**
  - `node-read.js` — Node.js 读取示例
  - `node-write.js` — Node.js 写入示例
  - `browser-canvas.html` — Canvas 渲染演示
  - `browser-html.html` — HTML 渲染演示
  - `browser-test.html` — 综合浏览器测试
  - `demo_template.xlsb` — 来自 jxlsb Java 版本的模板

### 修复

- ZIP 格式与 Java 生成的 XLSB 文件兼容
- ZipWriter 中的中央目录偏移计算
- 从单元格记录解析 styleIndex（字节 4-6）
- StylesWriter.addDateFormat() 返回一致的 styleId
- 从 styles.bin 正确读取格式代码

### 依赖

- pako ^2.1.0 - ZIP 压缩/解压

### 平台支持

- Node.js 14+
- 现代浏览器（Chrome、Firefox、Safari、Edge）

---

## 版本历史

| 版本 | 日期 | 描述 |
|------|------|------|
| 1.0.0 | 2026-04-22 | 首次发布，含读/写/渲染 |

---

## 未来计划

- [ ] 模板填充（`fillBatch`、`fillAtMarker`）
- [ ] 样式系统扩展（字体、边框、填充）
- [ ] 公式支持
- [ ] 图表渲染
- [ ] 大数据集流式写入
- [ ] 重操作的工作线程支持

## 相关文档

- [README.md](README.md)（中文） / [README_en.md](README_en.md)（英文）
- [MANUAL.md](MANUAL.md)（中文） / [MANUAL_en.md](MANUAL_en.md)（英文）

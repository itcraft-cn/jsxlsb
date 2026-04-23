# jsxlsb - JavaScript XLSB Library

## 纯 JavaScript 实现的 XLSB (Excel Binary Workbook) 格式读写库

基于 Java 版本 jxlsb (`~/code/java/jxlsb`) 开发，支持 Node.js 和浏览器环境。

## 构建命令

```bash
npm run build       # 构建 UMD 包
npm run build:watch # 监听模式
npm run typecheck   # 类型检查
```

## 测试文件

使用 `/tmp/all_formats.xlsb` 进行格式测试（来自 Java jxlsb）。

## 输出

- `dist/jsxlsb.js` - UMD 包 (~320KB，包含 pako)

## AI guide

### 角色定位

1. 你是资深架构师
    - 在开发前，会对需求进行详尽分析，提供多套方案，以上、中、下三策的形式呈现，以备后续决策参考
    - 在设计时，会充分考虑非功能性需求：安全性、可扩展性、可用性、可观测性、性能等
    - 在设计细节时，充分考虑各种设计模式及各语言特性
2. 你是资深开发者，对JS/TS非常了解
    - 可进行常见UI交互设计
    - 设计感在线

### 交互规则

1. 处于 AI Coding Plan 包月模式下，Token 不考虑，时间不考虑，专注于高效而完整地工作
2. 所有交互均使用简体中文
3. 持续使用 skill /memrec 记忆
4. 每次沟通产出文件后，均执行 git 提交
5. git 仅以当前 `user.name` 提交，不推送到远端
6. git 提交均遵循约定式提交规范（Conventional Commits）执行
7. 编排计划或设计时，如过长(>3000行)，拆分为多份文档
8. 重要内容(plan、design等)，随时记录到 MEMORY.md 和 memrec
9. 版本管理忽略 MEMORY.md，写入 .gitignore，不提交到 Git

### 编码规范

授权读取：/disk2/helly_data/code/markdown/self-ai-spec/lang-spec/spec.js.md

Read /disk2/helly_data/code/markdown/self-ai-spec/lang-spec/spec.js.md

## 项目特定约定

### 文件组织

- `src/core/` - 核心层（BIFF12、ZIP、SST）
- `src/api/` - API 层（XlsbReader、XlsbWriter）
- `src/render/` - 渲染层（HtmlRenderer、CanvasRenderer）
- `src/utils/` - 工具类（FormatUtils、DateUtils）
- `examples/` - 示例代码

### 关键发现

1. ZIP 格式使用 pako 库，Data Descriptor 模式（bit 3 = 1）
2. Central directory offset 写入 position 42，不是 38
3. Cell 记录 bytes 4-6 是 styleIndex（3字节）
4. Excel 日期格式：46131.xxx（整数=天数，小数=时间百分比）
const { XlsbReader, XlsbWriter, CellData } = require('../dist/jsxlsb.js');
const fs = require('fs');

console.log('=== jsxlsb Node.js 功能测试 ===\n');

// 1. 普通写 - writeBatch
console.log('1. 普通写 - writeBatch');
const writer1 = XlsbWriter.builder().path('./test-batch.xlsb').build();

const batchData = [
  [CellData.text('序号'), CellData.text('名称'), CellData.text('金额'), CellData.text('百分比')],
  [CellData.number(1), CellData.text('项目A'), CellData.currency(10000), CellData.percentage(0.25)],
  [CellData.number(2), CellData.text('项目B'), CellData.currency(25000), CellData.percentage(0.35)],
  [CellData.number(3), CellData.text('项目C'), CellData.numberNegativeRed(-5000), CellData.percentage(0.40)],
];

writer1.writeBatch('项目清单', batchData);
writer1.close();
console.log('   ✓ 已创建 test-batch.xlsb\n');

// 2. 流式写 - startSheet/writeRows/endSheet
console.log('2. 流式写 - startSheet/writeRows/endSheet');
const writer2 = XlsbWriter.builder().path('./test-stream.xlsb').build();

writer2.startSheet('大数据表', 4);

// 写入第一批
const batch1 = [
  [CellData.text('ID'), CellData.text('Name'), CellData.text('Value'), CellData.text('Status')],
];
writer2.writeRows(batch1);

// 写入第二批（模拟分页写入）
for (let i = 0; i < 3; i++) {
  const batch = [
    [CellData.number(i * 10 + 1), CellData.text(`Item${i * 10 + 1}`), CellData.number(Math.random() * 1000), CellData.text('Active')],
    [CellData.number(i * 10 + 2), CellData.text(`Item${i * 10 + 2}`), CellData.number(Math.random() * 1000), CellData.text('Pending')],
    [CellData.number(i * 10 + 3), CellData.text(`Item${i * 10 + 3}`), CellData.number(Math.random() * 1000), CellData.text('Done')],
  ];
  writer2.writeRows(batch);
}

writer2.endSheet();
writer2.close();
console.log('   ✓ 已创建 test-stream.xlsb\n');

// 3. 普通读 - forEachRow (流式读)
console.log('3. 普通读 - forEachRow (流式读)');

console.log('   --- test-batch.xlsb ---');
const reader1 = XlsbReader.builder().path('./test-batch.xlsb').build();
const sheets1 = reader1.getSheetInfos();
console.log('   Sheets:', sheets1.map(s => s.name));

let rowCount1 = 0;
reader1.forEachRow(0, {
  onRowStart(row, colCount) {
    console.log(`   Row ${row}: (${colCount} columns)`);
  },
  onCell(row, col, cell) {
    console.log(`     [${row},${col}] value=${cell.value}, fmt=${cell.formatCode || 'none'}`);
  },
  onRowEnd(row) {
    rowCount1++;
  }
});
console.log(`   ✓ 共读取 ${rowCount1} 行\n`);
reader1.close();

// 4. 分页读 - readRows
console.log('4. 分页读 - readRows');

console.log('   --- test-stream.xlsb ---');
const reader2 = XlsbReader.builder().path('./test-stream.xlsb').build();
const sheets2 = reader2.getSheetInfos();
console.log('   Sheets:', sheets2.map(s => s.name));

// 分页读取：每次读3行
let startRow = 0;
const batchSize = 3;
let totalRows = 0;

while (true) {
  const rows = reader2.readRows(0, startRow, batchSize);
  if (rows.length === 0) break;
  
  console.log(`   Batch starting at row ${startRow}:`);
  rows.forEach((row, idx) => {
    console.log(`     Row ${startRow + idx}: ${row.length} cells`);
    row.forEach((cell, col) => {
      if (cell) {
        console.log(`       [${startRow + idx},${col}] ${cell.value}`);
      }
    });
  });
  
  startRow += rows.length;
  totalRows += rows.length;
  
  if (rows.length < batchSize) break;  // 最后一批不足 batchSize，说明读完
}

console.log(`   ✓ 分页读取共 ${totalRows} 行\n`);
reader2.close();

// 5. 模板写检查
console.log('5. 模板写 - 检查实现状态');
console.log('   模板填充功能（fillBatch, fillAtMarker）:');
console.log('   ⚠ 未实现 - 需要 TemplateReader, TemplateFiller');
console.log('   模板文件位于: examples/templates/demo_template.xlsb\n');

// 清理测试文件
console.log('=== 清理测试文件 ===');
fs.unlinkSync('./test-batch.xlsb');
fs.unlinkSync('./test-stream.xlsb');
console.log('   ✓ 已删除测试文件\n');

// 功能总结
console.log('=== 功能总结 ===');
console.log('');
console.log('| 功能 | 状态 | API |');
console.log('|------|------|-----|');
console.log('| 普通写 | ✓ 完成 | writeBatch |');
console.log('| 流式写 | ✓ 完成 | startSheet/writeRows/endSheet |');
console.log('| 普通读 | ✓ 完成 | forEachRow |');
console.log('| 分页读 | ✓ 完成 | readRows |');
console.log('| 模板写 | ⚠ 未完成 | fillBatch/fillAtMarker |');
console.log('');
console.log('=== 测试完成 ===');
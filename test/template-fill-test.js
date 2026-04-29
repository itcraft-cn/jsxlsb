const { XlsbWriter, CellData, TemplateReader, SheetParser } = require('../dist/jsxlsb.js');
const fs = require('fs');
const path = require('path');

console.log('=== 模板填充测试 ===\n');

const templatePath = path.join(__dirname, '../examples/templates/demo_template.xlsb');

console.log('1. 模板结构分析');
const templateReader = new TemplateReader(fs.readFileSync(templatePath));
console.log('   Sheet数量:', templateReader.getSheetCount());
console.log('   Sheet信息:', templateReader.getSheetInfos());

const parser = templateReader.parseSheet(0);
const cells = parser.parse();
console.log('   模板单元格数:', cells.length);
console.log('   MaxRow:', parser.getMaxRow());
console.log('   MaxCol:', parser.getMaxCol());

const markerPos = parser.findMarker('${data}');
console.log('   标记 ${data} 位置:', markerPos);

templateReader.close();

console.log('\n2. 按坐标填充测试');
const writer1 = XlsbWriter.builder()
  .template(templatePath)
  .path('/tmp/demo_output_fixed.xlsb')
  .build();

console.log('   模板Sheet数:', writer1.getTemplateSheetCount());

const data1 = [
  ['张三', '北京', 25, '男'],
  ['李四', '上海', 30, '女'],
  ['王五', '广州', 28, '男'],
];

console.log('   填充位置: row=12, col=8');
console.log('   填充数据:', JSON.stringify(data1));

writer1.fillBatch(0, data1, 12, 8);
writer1.close();

console.log('   ✓ 输出: /tmp/demo_output_fixed.xlsb');

console.log('\n3. 按标记填充测试');
const writer2 = XlsbWriter.builder()
  .template(templatePath)
  .path('/tmp/demo_output_marker.xlsb')
  .build();

const data2 = [
  ['赵六', '深圳', 35, '男'],
  ['钱七', '杭州', 22, '女'],
];

console.log('   查找标记: ${data}');
console.log('   填充数据:', JSON.stringify(data2));

writer2.fillAtMarker(0, '${data}', data2);
writer2.close();

console.log('   ✓ 输出: /tmp/demo_output_marker.xlsb');

console.log('\n4. 流式填充测试');
const writer3 = XlsbWriter.builder()
  .template(templatePath)
  .path('/tmp/demo_output_streaming.xlsb')
  .build();

writer3.startFill(0, 12, 8);

writer3.fillRows([['孙八', '成都', 40, '男']]);
writer3.fillRows([['周九', '武汉', 33, '女']]);
writer3.fillRows([['吴十', '南京', 27, '男']]);

writer3.endFill();
writer3.close();

console.log('   ✓ 输出: /tmp/demo_output_streaming.xlsb');

console.log('\n=== 测试完成 ===');
console.log('请用Excel/WPS打开以下文件验证:');
console.log('  /tmp/demo_output_fixed.xlsb');
console.log('  /tmp/demo_output_marker.xlsb');
console.log('  /tmp/demo_output_streaming.xlsb');
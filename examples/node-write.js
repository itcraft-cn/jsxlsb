const { XlsbWriter, CellData } = require('../dist/jsxlsb.js');

const writer = XlsbWriter.builder().path('./output.xlsb').build();

const data = [
  [CellData.text('姓名'), CellData.text('年龄'), CellData.text('工资')],
  [CellData.text('张三'), CellData.number(25), CellData.currency(5000)],
  [CellData.text('李四'), CellData.number(30), CellData.currency(8000)],
  [CellData.text('王五'), CellData.number(28), CellData.percentage(0.15)],
];

writer.writeBatch('员工表', data);

writer.close();

console.log('XLSB file created: output.xlsb');
const { XlsbReader } = require('../dist/jsxlsb.js');

const reader = XlsbReader.builder().path('./output.xlsb').build();

const sheets = reader.getSheetInfos();
console.log('Sheets:', sheets);

reader.forEachRow(0, {
  onRowStart(row, colCount) {
    console.log(`Row ${row} start (${colCount} columns)`);
  },
  onCell(row, col, cell) {
    console.log(`  ${row},${col}: ${cell.value}`);
  },
  onRowEnd(row) {
    console.log(`Row ${row} end`);
  }
});

reader.close();
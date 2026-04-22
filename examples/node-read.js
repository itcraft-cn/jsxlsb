const { XlsbReader } = require('../dist/jsxlsb.js');

const reader = XlsbReader.builder().path('./output.xlsb').build();

const sheets = reader.getSheetInfos();
console.log('Sheets:', sheets);

const styles = reader.getStyles();
console.log('Styles count:', styles.getStyleCount());
console.log('Formats:', styles.getFormats());

reader.forEachRow(0, {
  onRowStart(row, colCount) {
    console.log(`Row ${row} start (${colCount} columns)`);
  },
  onCell(row, col, cell) {
    console.log(`  ${row},${col}: value=${cell.value}, type=${cell.type}, formatCode=${cell.formatCode || 'none'}`);
  },
  onRowEnd(row) {
    console.log(`Row ${row} end`);
  }
});

reader.close();
const { XlsbWriter, XlsbReader, CellData } = require('../dist/jsxlsb.js');
const fs = require('fs');
const path = require('path');

const TOTAL_ROWS = 100000;
const COLUMN_COUNT = 10;
const PAGE_SIZE = 1000;

async function runBenchmark() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║         jsxlsb 性能基准测试 (10万行 × 10字段)                 ║');
    console.log('║         字段类型: 3字符串 + 4整数 + 3浮点数                   ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    const batchFile = '/tmp/jsxlsb_batch_write.xlsb';
    const streamFile = '/tmp/jsxlsb_stream_write.xlsb';
    
    console.log('═════════════════════════════════════════════════════════════');
    console.log('1. 普通分页写 (startSheet + writeRows + endSheet)');
    console.log('═════════════════════════════════════════════════════════════\n');
    
    const batchWriteStart = Date.now();
    const batchWriter = XlsbWriter.builder().path(batchFile).build();
    batchWriter.startSheet('Data', COLUMN_COUNT);
    
    let offset = 0;
    while (offset < TOTAL_ROWS) {
        const batchSize = Math.min(PAGE_SIZE, TOTAL_ROWS - offset);
        const batch = createBatchData(offset, batchSize);
        batchWriter.writeRows(batch);
        offset += batchSize;
    }
    
    batchWriter.endSheet();
    batchWriter.close();
    const batchWriteTime = Date.now() - batchWriteStart;
    const batchWriteSize = fs.statSync(batchFile).size;
    
    console.log(`写入耗时: ${batchWriteTime} ms`);
    console.log(`文件大小: ${(batchWriteSize / 1000000).toFixed(2)} MB`);
    console.log(`写入速度: ${(TOTAL_ROWS / (batchWriteTime / 1000)).toFixed(0)} 行/秒`);
    
    console.log('\n═════════════════════════════════════════════════════════════');
    console.log('2. 普通分页读 (readRows, 每次1000行)');
    console.log('═════════════════════════════════════════════════════════════\n');
    
    const batchReadStart = Date.now();
    const batchReader = XlsbReader.builder().path(batchFile).build();
    
    offset = 0;
    while (offset < TOTAL_ROWS) {
        const batch = batchReader.readRows(0, offset, PAGE_SIZE);
        if (batch.length === 0) break;
        offset += batch.length;
    }
    
    batchReader.close();
    const batchReadTime = Date.now() - batchReadStart;
    
    console.log(`读取耗时: ${batchReadTime} ms`);
    console.log(`读取速度: ${(TOTAL_ROWS / (batchReadTime / 1000)).toFixed(0)} 行/秒`);
    
    console.log('\n═════════════════════════════════════════════════════════════');
    console.log('3. 普通流式写 (writeBatch)');
    console.log('═════════════════════════════════════════════════════════════\n');
    
    const streamWriteStart = Date.now();
    const streamWriter = XlsbWriter.builder().path(streamFile).build();
    
    const streamData = [];
    for (let row = 0; row < TOTAL_ROWS; row++) {
        const rowData = [];
        for (let col = 0; col < COLUMN_COUNT; col++) {
            rowData.push(createCell(row, col));
        }
        streamData.push(rowData);
    }
    
    streamWriter.writeBatch('Data', streamData);
    streamWriter.close();
    const streamWriteTime = Date.now() - streamWriteStart;
    const streamWriteSize = fs.statSync(streamFile).size;
    
    console.log(`写入耗时: ${streamWriteTime} ms`);
    console.log(`文件大小: ${(streamWriteSize / 1000000).toFixed(2)} MB`);
    console.log(`写入速度: ${(TOTAL_ROWS / (streamWriteTime / 1000)).toFixed(0)} 行/秒`);
    
    console.log('\n═════════════════════════════════════════════════════════════');
    console.log('4. 普通流式读 (forEachRow)');
    console.log('═════════════════════════════════════════════════════════════\n');
    
    const streamReadStart = Date.now();
    const streamReader = XlsbReader.builder().path(streamFile).build();
    
    let rowCount = 0;
    streamReader.forEachRow(0, {
        onRowStart(row, colCount) {},
        onCell(row, col, cell) {
            if (col === 0) rowCount++;
        },
        onRowEnd(row) {}
    });
    
    streamReader.close();
    const streamReadTime = Date.now() - streamReadStart;
    
    console.log(`读取耗时: ${streamReadTime} ms`);
    console.log(`读取速度: ${(TOTAL_ROWS / (streamReadTime / 1000)).toFixed(0)} 行/秒`);
    
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    性能测试结果汇总                           ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    console.log('┌────────────────────┬──────────────┬──────────────┬──────────────┐');
    console.log('│ 操作类型           │ 耗时 (ms)    │ 文件大小(MB) │ 速度(行/秒) │');
    console.log('├────────────────────┼──────────────┼──────────────┼──────────────┤');
    console.log(`│ 分页写             │ ${batchWriteTime.toString().padStart(12)} │ ${(batchWriteSize/1000000).toFixed(2).padStart(12)} │ ${(TOTAL_ROWS/(batchWriteTime/1000)).toFixed(0).padStart(12)} │`);
    console.log(`│ 分页读             │ ${batchReadTime.toString().padStart(12)} │ ${'-'.padStart(12)} │ ${(TOTAL_ROWS/(batchReadTime/1000)).toFixed(0).padStart(12)} │`);
    console.log(`│ 流式写             │ ${streamWriteTime.toString().padStart(12)} │ ${(streamWriteSize/1000000).toFixed(2).padStart(12)} │ ${(TOTAL_ROWS/(streamWriteTime/1000)).toFixed(0).padStart(12)} │`);
    console.log(`│ 流式读             │ ${streamReadTime.toString().padStart(12)} │ ${'-'.padStart(12)} │ ${(TOTAL_ROWS/(streamReadTime/1000)).toFixed(0).padStart(12)} │`);
    console.log('└────────────────────┴──────────────┴──────────────┴──────────────┘');
}

runBenchmark().catch(console.error);
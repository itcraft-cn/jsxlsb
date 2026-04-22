(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.jsxlsb = {}));
})(this, (function (exports) { 'use strict';

    class ZipWriter {
        constructor() {
            this.entries = [];
        }
        addEntry(name, data) {
            this.entries.push({ name, data });
        }
        async toBlob() {
            const result = this.toUint8Array();
            return new Blob([result.buffer], { type: 'application/zip' });
        }
        toUint8Array() {
            const result = [];
            let offset = 0;
            const centralHeaders = [];
            for (const entry of this.entries) {
                const compressed = this.compress(entry.data);
                const localHeader = this.createLocalFileHeaderArray(entry.name, compressed.length, entry.data.length, offset);
                result.push(...localHeader);
                result.push(...Array.from(compressed));
                const centralHeader = this.createCentralDirectoryHeaderArray(entry.name, compressed.length, entry.data.length, offset);
                centralHeaders.push(centralHeader);
                offset += localHeader.length + compressed.length;
            }
            for (const header of centralHeaders) {
                result.push(...header);
            }
            const centralDirSize = centralHeaders.reduce((sum, h) => sum + h.length, 0);
            const endRecord = this.createEndOfCentralDirectoryArray(this.entries.length, centralDirSize, offset);
            result.push(...endRecord);
            return new Uint8Array(result);
        }
        compress(data) {
            if (typeof require !== 'undefined') {
                try {
                    const zlib = require('zlib');
                    const compressed = zlib.deflateRawSync(Buffer.from(data));
                    return new Uint8Array(compressed);
                }
                catch (e) {
                }
            }
            return data;
        }
        createLocalFileHeaderArray(name, compressedSize, uncompressedSize, offset) {
            const nameBytes = this.encodeString(name);
            return [
                0x50, 0x4B, 0x03, 0x04,
                20, 0,
                0, 0,
                8, 0,
                0, 0, 0, 0, 0, 0, 0, 0,
                ...this.writeUInt32LE(compressedSize),
                ...this.writeUInt32LE(uncompressedSize),
                ...this.writeUInt16LE(nameBytes.length),
                0, 0,
                ...nameBytes
            ];
        }
        createCentralDirectoryHeaderArray(name, compressedSize, uncompressedSize, offset) {
            const nameBytes = this.encodeString(name);
            return [
                0x50, 0x4B, 0x01, 0x02,
                20, 0,
                20, 0,
                0, 0,
                8, 0,
                0, 0, 0, 0, 0, 0, 0, 0,
                ...this.writeUInt32LE(compressedSize),
                ...this.writeUInt32LE(uncompressedSize),
                ...this.writeUInt16LE(nameBytes.length),
                0, 0,
                0, 0,
                0, 0,
                0, 0, 0, 0,
                ...this.writeUInt32LE(offset),
                ...nameBytes
            ];
        }
        createEndOfCentralDirectoryArray(entryCount, centralDirSize, offset) {
            return [
                0x50, 0x4B, 0x05, 0x06,
                0, 0, 0, 0,
                ...this.writeUInt16LE(entryCount),
                ...this.writeUInt16LE(entryCount),
                ...this.writeUInt32LE(centralDirSize),
                ...this.writeUInt32LE(offset),
                0, 0
            ];
        }
        writeUInt16LE(value) {
            return [value & 0xFF, (value >> 8) & 0xFF];
        }
        writeUInt32LE(value) {
            return [
                value & 0xFF,
                (value >> 8) & 0xFF,
                (value >> 16) & 0xFF,
                (value >> 24) & 0xFF
            ];
        }
        encodeString(str) {
            const result = [];
            for (let i = 0; i < str.length; i++) {
                result.push(str.charCodeAt(i) & 0xFF);
            }
            return result;
        }
        clear() {
            this.entries = [];
        }
        getEntryCount() {
            return this.entries.length;
        }
    }

    const RecordTypes = {
        BrtRowHdr: 0,
        BrtCellBlank: 1,
        BrtCellRk: 2,
        BrtCellError: 3,
        BrtCellBool: 4,
        BrtCellReal: 5,
        BrtCellSt: 6,
        BrtCellIsst: 7,
        BrtSSTItem: 19,
        BrtFileVersion: 128,
        BrtBeginSheet: 129,
        BrtEndSheet: 130,
        BrtBeginBook: 131,
        BrtEndBook: 132,
        BrtBeginWsViews: 133,
        BrtEndWsViews: 134,
        BrtBeginBookViews: 135,
        BrtEndBookViews: 136,
        BrtBeginWsView: 137,
        BrtEndWsView: 138,
        BrtBeginBundleShs: 143,
        BrtEndBundleShs: 144,
        BrtBeginSheetData: 145,
        BrtEndSheetData: 146,
        BrtWsProp: 147,
        BrtWsDim: 148,
        BrtPane: 151,
        BrtSel: 152,
        BrtWbProp: 153,
        BrtBundleSh: 156,
        BrtBookView: 158,
        BrtBeginSst: 159,
        BrtEndSst: 160,
        BrtPageSetup: 476,
        BrtPageSetupView: 477,
        BrtWsFmtInfo: 485,
        BrtDrawing: 535,
        BrtFmt: 44,
        BrtFont: 43,
        BrtFill: 45,
        BrtBorder: 46,
        BrtXF: 47,
        BrtBeginStyleSheet: 370,
        BrtEndStyleSheet: 371,
        BrtBeginCellStyleXFs: 278,
        BrtEndCellStyleXFs: 279,
        BrtBeginCellXFs: 280,
        BrtEndCellXFs: 281,
        BrtMergeCell: 176,
        BrtBeginMergeCells: 177,
        BrtEndMergeCells: 178,
        BrtBeginFmts: 615,
        BrtEndFmts: 616,
        BrtBeginFonts: 611,
        BrtEndFonts: 612,
        BrtBeginFills: 603,
        BrtEndFills: 604,
        BrtBeginBorders: 613,
        BrtEndBorders: 614,
        BrtBeginXFs: 626,
        BrtEndXFs: 627,
        BrtBeginStyles: 617,
        BrtEndStyles: 618,
    };

    function writeVarInt(value) {
        if (value < 128) {
            return [value & 0x7F];
        }
        return [(value & 0x7F) | 0x80, (value >> 7) & 0x7F];
    }
    function writeVarSize(value) {
        if (value < 128) {
            return [value];
        }
        if (value < 16384) {
            return [(value & 0x7F) | 0x80, (value >> 7) & 0x7F];
        }
        if (value < 2097152) {
            return [
                (value & 0x7F) | 0x80,
                ((value >> 7) & 0x7F) | 0x80,
                (value >> 14) & 0x7F
            ];
        }
        return [
            (value & 0x7F) | 0x80,
            ((value >> 7) & 0x7F) | 0x80,
            ((value >> 14) & 0x7F) | 0x80,
            (value >> 21) & 0x7F
        ];
    }
    function readVarInt(buffer, offset) {
        const b0 = buffer[offset];
        if ((b0 & 0x80) === 0) {
            return b0;
        }
        const b1 = buffer[offset + 1] & 0x7F;
        return (b0 & 0x7F) | (b1 << 7);
    }
    function readVarSize(buffer, offset) {
        const b0 = buffer[offset];
        if ((b0 & 0x80) === 0) {
            return b0;
        }
        const b1 = buffer[offset + 1];
        if ((b1 & 0x80) === 0) {
            return (b0 & 0x7F) | (b1 << 7);
        }
        const b2 = buffer[offset + 2];
        if ((b2 & 0x80) === 0) {
            return (b0 & 0x7F) | ((b1 & 0x7F) << 7) | (b2 << 14);
        }
        const b3 = buffer[offset + 3] & 0x7F;
        return (b0 & 0x7F) | ((b1 & 0x7F) << 7) | ((b2 & 0x7F) << 14) | (b3 << 21);
    }
    function varIntSize(value) {
        return value >= 128 ? 2 : 1;
    }
    function varSizeSize(value) {
        if (value < 128)
            return 1;
        if (value < 16384)
            return 2;
        if (value < 2097152)
            return 3;
        return 4;
    }
    function writeIntLE(value) {
        return [
            value & 0xFF,
            (value >> 8) & 0xFF,
            (value >> 16) & 0xFF,
            (value >> 24) & 0xFF
        ];
    }
    function readIntLE(buffer, offset) {
        return (buffer[offset]) |
            (buffer[offset + 1] << 8) |
            (buffer[offset + 2] << 16) |
            (buffer[offset + 3] << 24);
    }
    function writeDoubleLE(value) {
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setFloat64(0, value, true);
        return Array.from(new Uint8Array(buffer));
    }
    function readDoubleLE(buffer, offset) {
        const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 8);
        return view.getFloat64(0, true);
    }
    function encodeUTF16LE(str) {
        const result = [];
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            result.push(code & 0xFF, (code >> 8) & 0xFF);
        }
        return result;
    }
    function decodeUTF16LE(buffer, offset, charCount) {
        const chars = [];
        for (let i = 0; i < charCount; i++) {
            const code = buffer[offset + i * 2] | (buffer[offset + i * 2 + 1] << 8);
            chars.push(String.fromCharCode(code));
        }
        return chars.join('');
    }
    function writeXLWideString(str) {
        if (!str || str.length === 0) {
            return [0, 0, 0, 0];
        }
        const utf16le = encodeUTF16LE(str);
        const lengthBytes = writeIntLE(str.length);
        return [...lengthBytes, ...utf16le];
    }

    class Biff12Writer {
        constructor() {
            this.buffer = [];
        }
        writeRecordHeader(recordType, recordSize) {
            this.buffer.push(...writeVarInt(recordType));
            this.buffer.push(...writeVarSize(recordSize));
        }
        writeEmptyRecord(recordType) {
            this.writeRecordHeader(recordType, 0);
        }
        writeIntLE(value) {
            this.buffer.push(...writeIntLE(value));
        }
        writeDoubleLE(value) {
            this.buffer.push(...writeDoubleLE(value));
        }
        writeBytes(bytes) {
            if (Array.isArray(bytes)) {
                this.buffer.push(...bytes);
            }
            else {
                for (let i = 0; i < bytes.length; i++) {
                    this.buffer.push(bytes[i]);
                }
            }
        }
        writeXLWideString(str) {
            this.buffer.push(...writeXLWideString(str));
        }
        writeCell(column, styleIndex = 0) {
            this.writeIntLE(column);
            this.buffer.push(styleIndex & 0xFF);
            this.buffer.push((styleIndex >> 8) & 0xFF);
            this.buffer.push((styleIndex >> 16) & 0xFF);
            this.buffer.push(0);
        }
        writeBrtRowHdr(row, columnCount) {
            const spans = Math.ceil(columnCount / 16);
            const spanValue = spans << 16 | spans;
            const recordSize = 16;
            this.writeRecordHeader(RecordTypes.BrtRowHdr, recordSize);
            this.writeIntLE(row);
            this.writeIntLE(spanValue);
            this.writeIntLE(0);
            this.writeIntLE(0);
            this.writeIntLE(0);
            this.writeIntLE(0);
        }
        writeBrtCellBlank(row, col, styleIndex = 0) {
            this.writeRecordHeader(RecordTypes.BrtCellBlank, 8);
            this.writeCell(col, styleIndex);
        }
        writeBrtCellRk(row, col, value, styleIndex = 0) {
            this.writeRecordHeader(RecordTypes.BrtCellRk, 12);
            this.writeCell(col, styleIndex);
            this.writeIntLE(this.encodeRk(value));
        }
        writeBrtCellReal(row, col, value, styleIndex = 0) {
            this.writeRecordHeader(RecordTypes.BrtCellReal, 16);
            this.writeCell(col, styleIndex);
            this.writeDoubleLE(value);
        }
        writeBrtCellBool(row, col, value, styleIndex = 0) {
            this.writeRecordHeader(RecordTypes.BrtCellBool, 9);
            this.writeCell(col, styleIndex);
            this.buffer.push(value ? 1 : 0);
        }
        writeBrtCellIsst(row, col, sstIndex, styleIndex = 0) {
            this.writeRecordHeader(RecordTypes.BrtCellIsst, 12);
            this.writeCell(col, styleIndex);
            this.writeIntLE(sstIndex);
        }
        writeBrtCellSt(row, col, text, styleIndex = 0) {
            const utf16le = encodeUTF16LE(text);
            const recordSize = 8 + 4 + utf16le.length;
            this.writeRecordHeader(RecordTypes.BrtCellSt, recordSize);
            this.writeCell(col, styleIndex);
            this.writeIntLE(text.length);
            this.writeBytes(utf16le);
        }
        writeBrtWsDim(rowFirst, rowLast, colFirst, colLast) {
            this.writeRecordHeader(RecordTypes.BrtWsDim, 16);
            this.writeIntLE(rowFirst);
            this.writeIntLE(rowLast);
            this.writeIntLE(colFirst);
            this.writeIntLE(colLast);
        }
        writeBrtBeginSheet() {
            this.writeEmptyRecord(RecordTypes.BrtBeginSheet);
        }
        writeBrtEndSheet() {
            this.writeEmptyRecord(RecordTypes.BrtEndSheet);
        }
        writeBrtBeginSheetData() {
            this.writeEmptyRecord(RecordTypes.BrtBeginSheetData);
        }
        writeBrtEndSheetData() {
            this.writeEmptyRecord(RecordTypes.BrtEndSheetData);
        }
        encodeRk(value) {
            if (Number.isInteger(value) && value >= -536870912 && value <= 536870911) {
                return ((value << 2) | 2) & 0xFFFFFFFF;
            }
            const floatBits = new DataView(new ArrayBuffer(8));
            floatBits.setFloat64(0, value, true);
            const low = floatBits.getInt32(0, true);
            const high = floatBits.getInt32(4, true);
            if ((high & 0xFFFFFFFC) === 0 && low === 0) {
                return ((high >>> 2) << 2) | 0;
            }
            return ((high >>> 2) << 2) | 1;
        }
        toUint8Array() {
            return new Uint8Array(this.buffer);
        }
        toArray() {
            return this.buffer;
        }
        size() {
            return this.buffer.length;
        }
        reset() {
            this.buffer = [];
        }
    }

    class SharedStringsTable {
        constructor() {
            this.strings = [];
            this.indexMap = new Map();
            this.totalCount = 0;
        }
        addString(str) {
            this.totalCount++;
            if (this.indexMap.has(str)) {
                return this.indexMap.get(str);
            }
            const newIndex = this.strings.length;
            this.strings.push(str);
            this.indexMap.set(str, newIndex);
            return newIndex;
        }
        getString(index) {
            return this.strings[index] || '';
        }
        getCount() {
            return this.strings.length;
        }
        getTotalCount() {
            return this.totalCount;
        }
        size() {
            return this.strings.length;
        }
        clear() {
            this.strings = [];
            this.indexMap.clear();
            this.totalCount = 0;
        }
        toBiff12Bytes() {
            const writer = new Biff12Writer();
            writer.writeRecordHeader(RecordTypes.BrtBeginSst, 8);
            writer.writeIntLE(this.totalCount);
            writer.writeIntLE(this.strings.length);
            for (const str of this.strings) {
                this.writeSSTItem(writer, str);
            }
            writer.writeEmptyRecord(RecordTypes.BrtEndSst);
            return writer.toUint8Array();
        }
        writeSSTItem(writer, str) {
            const utf16leBytes = [];
            for (let i = 0; i < str.length; i++) {
                const code = str.charCodeAt(i);
                utf16leBytes.push(code & 0xFF, (code >> 8) & 0xFF);
            }
            const recordSize = 1 + 4 + utf16leBytes.length;
            writer.writeRecordHeader(RecordTypes.BrtSSTItem, recordSize);
            writer.writeBytes([0]);
            writer.writeIntLE(str.length);
            writer.writeBytes(utf16leBytes);
        }
        load(buffer) {
            let offset = 0;
            while (offset < buffer.length - 2) {
                const recordType = readVarInt(buffer, offset);
                const typeSize = varIntSize(recordType);
                offset += typeSize;
                const recordSize = readVarSize(buffer, offset);
                const sizeBytes = varSizeSize(recordSize);
                offset += sizeBytes;
                if (offset + recordSize > buffer.length) {
                    break;
                }
                if (recordType === RecordTypes.BrtSSTItem) {
                    const data = buffer.slice(offset, offset + recordSize);
                    const text = this.parseSSTItem(data);
                    this.strings.push(text);
                }
                offset += recordSize;
            }
        }
        parseSSTItem(data) {
            data[0];
            const charCount = readIntLE(data, 1);
            return decodeUTF16LE(data, 5, charCount);
        }
    }

    class WorkbookWriter {
        constructor() {
            this.sheets = [];
        }
        addSheet(name) {
            this.sheets.push({ name, sheetId: this.sheets.length + 1 });
        }
        getSheetCount() {
            return this.sheets.length;
        }
        toBiff12Bytes() {
            const w = new Biff12Writer();
            w.writeEmptyRecord(RecordTypes.BrtBeginBook);
            this.writeBrtFileVersion(w);
            this.writeBrtWbProp(w);
            w.writeEmptyRecord(RecordTypes.BrtBeginBookViews);
            this.writeBrtBookView(w);
            w.writeEmptyRecord(RecordTypes.BrtEndBookViews);
            w.writeEmptyRecord(RecordTypes.BrtBeginBundleShs);
            for (const sheet of this.sheets) {
                this.writeBrtBundleSh(w, sheet);
            }
            w.writeEmptyRecord(RecordTypes.BrtEndBundleShs);
            w.writeEmptyRecord(RecordTypes.BrtEndBook);
            return w.toUint8Array();
        }
        writeBrtFileVersion(w) {
            const data = [
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00,
                0x00, 0x00, 0x78, 0x00, 0x6C, 0x00, 0x01, 0x00,
                0x00, 0x00, 0x33, 0x00, 0x01, 0x00, 0x00, 0x00,
                0x35, 0x00, 0x04, 0x00, 0x00, 0x00, 0x39, 0x00,
                0x33, 0x00, 0x30, 0x00, 0x32, 0x00, 0x00
            ];
            w.writeRecordHeader(RecordTypes.BrtFileVersion, data.length);
            w.writeBytes(data);
        }
        writeBrtWbProp(w) {
            const data = [
                0x20, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00
            ];
            w.writeRecordHeader(RecordTypes.BrtWbProp, data.length);
            w.writeBytes(data);
        }
        writeBrtBookView(w) {
            const data = [
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x80, 0x70, 0x00, 0x00, 0xCF, 0x30, 0x00, 0x00,
                0x58, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x78
            ];
            w.writeRecordHeader(RecordTypes.BrtBookView, data.length);
            w.writeBytes(data);
        }
        writeBrtBundleSh(w, sheet) {
            const relId = 'rId' + sheet.sheetId;
            const recordSize = 4 + 4 + (4 + relId.length * 2) + (4 + sheet.name.length * 2);
            w.writeRecordHeader(RecordTypes.BrtBundleSh, recordSize);
            w.writeIntLE(0);
            w.writeIntLE(1);
            w.writeXLWideString(relId);
            w.writeXLWideString(sheet.name);
        }
    }

    exports.CellType = void 0;
    (function (CellType) {
        CellType["TEXT"] = "text";
        CellType["NUMBER"] = "number";
        CellType["DATE"] = "date";
        CellType["BOOLEAN"] = "boolean";
        CellType["ERROR"] = "error";
        CellType["BLANK"] = "blank";
    })(exports.CellType || (exports.CellType = {}));

    const EXCEL_EPOCH_MILLIS = -22089888e5;
    function timestampToExcelDate(timestamp) {
        const days = (timestamp - EXCEL_EPOCH_MILLIS) / (24 * 60 * 60 * 1000);
        return days + 1.0;
    }

    const MIN_RK_INTEGER = -536870912;
    const MAX_RK_INTEGER = 536870911;
    class SheetWriter {
        constructor(sst, stylesWriter) {
            this.stylesWriter = null;
            this.defaultDateStyleId = 0;
            this.streamingWriter = null;
            this.streamingColumnCount = 0;
            this.sst = sst;
            if (stylesWriter) {
                this.stylesWriter = stylesWriter;
                this.defaultDateStyleId = 0;
            }
        }
        writeSheet(supplier, rowCount, columnCount) {
            const w = new Biff12Writer();
            this.writeSheetHeader(w, rowCount, columnCount);
            w.writeEmptyRecord(RecordTypes.BrtBeginSheetData);
            for (let row = 0; row < rowCount; row++) {
                this.writeBrtRowHdr(w, row, columnCount);
                for (let col = 0; col < columnCount; col++) {
                    const data = supplier.get(row, col);
                    if (data && data.type) {
                        this.writeCell(w, row, col, data);
                    }
                }
            }
            this.writeSheetFooter(w);
            return w.toUint8Array();
        }
        startStreaming(columnCount) {
            this.streamingWriter = new Biff12Writer();
            this.streamingColumnCount = columnCount;
            this.writeSheetHeader(this.streamingWriter, 0, columnCount);
            this.streamingWriter.writeEmptyRecord(RecordTypes.BrtBeginSheetData);
        }
        appendRows(supplier, startRow, batchSize, columnCount) {
            if (!this.streamingWriter) {
                throw new Error('Streaming not started, call startStreaming() first');
            }
            for (let row = startRow; row < startRow + batchSize; row++) {
                this.writeBrtRowHdr(this.streamingWriter, row, columnCount);
                for (let col = 0; col < columnCount; col++) {
                    const data = supplier.get(row, col);
                    if (data && data.type) {
                        this.writeCell(this.streamingWriter, row, col, data);
                    }
                }
            }
        }
        finalizeStreaming(totalRows, columnCount) {
            if (!this.streamingWriter) {
                throw new Error('Streaming not started');
            }
            this.writeSheetFooter(this.streamingWriter);
            const result = this.streamingWriter.toUint8Array();
            this.streamingWriter = null;
            this.streamingColumnCount = 0;
            return result;
        }
        writeSheetHeader(w, rowCount, columnCount) {
            w.writeEmptyRecord(RecordTypes.BrtBeginSheet);
            this.writeBrtWsProp(w);
            if (rowCount > 0 && columnCount > 0) {
                w.writeRecordHeader(RecordTypes.BrtWsDim, 16);
                w.writeIntLE(0);
                w.writeIntLE(rowCount - 1);
                w.writeIntLE(0);
                w.writeIntLE(columnCount - 1);
            }
            else {
                w.writeRecordHeader(RecordTypes.BrtWsDim, 16);
                w.writeIntLE(0);
                w.writeIntLE(0);
                w.writeIntLE(0);
                w.writeIntLE(0);
            }
            this.writeViewRecords(w);
        }
        writeSheetFooter(w) {
            w.writeEmptyRecord(RecordTypes.BrtEndSheetData);
            this.writePageSetupRecords(w);
            w.writeEmptyRecord(RecordTypes.BrtEndSheet);
        }
        writeBrtRowHdr(w, row, colCount) {
            const numSpans = colCount > 0 ? Math.ceil(colCount / 1024) : 0;
            const recordSize = 4 + 4 + 2 + 3 + 4 + (numSpans * 8);
            w.writeRecordHeader(RecordTypes.BrtRowHdr, recordSize);
            w.writeIntLE(row);
            w.writeIntLE(0);
            w.writeBytes([0x0E, 0x01]);
            w.writeBytes([0x00, 0x00, 0x00]);
            w.writeIntLE(numSpans);
            for (let seg = 0; seg < numSpans; seg++) {
                const segStartCol = seg * 1024;
                const segEndCol = Math.min((seg + 1) * 1024 - 1, colCount - 1);
                w.writeIntLE(segStartCol);
                w.writeIntLE(segEndCol);
            }
        }
        writeCell(w, row, col, data, styleIndex = 0) {
            switch (data.type) {
                case exports.CellType.NUMBER:
                    const num = data.value;
                    if (num === Math.floor(num) && num >= MIN_RK_INTEGER && num <= MAX_RK_INTEGER) {
                        this.writeBrtCellRk(w, col, num, styleIndex);
                    }
                    else {
                        this.writeBrtCellReal(w, col, num, styleIndex);
                    }
                    break;
                case exports.CellType.TEXT:
                    const sstIdx = this.sst.addString(data.value);
                    this.writeBrtCellIsst(w, col, sstIdx, styleIndex);
                    break;
                case exports.CellType.DATE:
                    const timestamp = data.value;
                    const excelDate = timestampToExcelDate(timestamp);
                    this.writeBrtCellReal(w, col, excelDate, this.defaultDateStyleId);
                    break;
                case exports.CellType.BOOLEAN:
                    this.writeBrtCellBool(w, col, data.value, styleIndex);
                    break;
                case exports.CellType.BLANK:
                    this.writeBrtCellBlank(w, col, styleIndex);
                    break;
                default:
                    throw new Error('Unknown cell type: ' + data.type);
            }
        }
        writeBrtCellRk(w, col, value, styleIndex) {
            w.writeRecordHeader(RecordTypes.BrtCellRk, 12);
            w.writeCell(col, styleIndex);
            w.writeIntLE(this.encodeRk(value));
        }
        writeBrtCellReal(w, col, value, styleIndex) {
            w.writeRecordHeader(RecordTypes.BrtCellReal, 16);
            w.writeCell(col, styleIndex);
            w.writeDoubleLE(value);
        }
        writeBrtCellBool(w, col, value, styleIndex) {
            w.writeRecordHeader(RecordTypes.BrtCellBool, 9);
            w.writeCell(col, styleIndex);
            w.writeBytes([value ? 1 : 0]);
        }
        writeBrtCellIsst(w, col, sstIndex, styleIndex) {
            w.writeRecordHeader(RecordTypes.BrtCellIsst, 12);
            w.writeCell(col, styleIndex);
            w.writeIntLE(sstIndex);
        }
        writeBrtCellBlank(w, col, styleIndex) {
            w.writeRecordHeader(RecordTypes.BrtCellBlank, 8);
            w.writeCell(col, styleIndex);
        }
        encodeRk(value) {
            const buffer = new ArrayBuffer(8);
            const view = new DataView(buffer);
            view.setFloat64(0, value, true);
            const high = view.getInt32(4, true);
            return high;
        }
        writeBrtWsProp(w) {
            const data = [
                0xC9, 0x04, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
                0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x00
            ];
            w.writeRecordHeader(RecordTypes.BrtWsProp, data.length);
            w.writeBytes(data);
        }
        writeViewRecords(w) {
            w.writeEmptyRecord(RecordTypes.BrtBeginWsViews);
            const wsViewData = [
                0xDC, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x40, 0x00, 0x00, 0x00, 0x64, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00
            ];
            w.writeRecordHeader(RecordTypes.BrtBeginWsView, wsViewData.length);
            w.writeBytes(wsViewData);
            const selData = [
                0x03, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00,
                0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x01, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00,
                0x06, 0x00, 0x00, 0x00, 0x07, 0x00, 0x00, 0x00,
                0x07, 0x00, 0x00, 0x00
            ];
            w.writeRecordHeader(RecordTypes.BrtSel, selData.length);
            w.writeBytes(selData);
            w.writeEmptyRecord(RecordTypes.BrtEndWsView);
            w.writeEmptyRecord(RecordTypes.BrtEndWsViews);
            const fmtInfoData = [
                0x00, 0x09, 0x00, 0x00, 0x08, 0x00, 0x0E, 0x01,
                0x00, 0x00, 0x00, 0x00
            ];
            w.writeRecordHeader(RecordTypes.BrtWsFmtInfo, fmtInfoData.length);
            w.writeBytes(fmtInfoData);
        }
        writePageSetupRecords(w) {
            const drawingData = [
                0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00,
                0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x01, 0x00, 0x00, 0x00
            ];
            w.writeRecordHeader(RecordTypes.BrtDrawing, drawingData.length);
            w.writeBytes(drawingData);
            const psViewData = [0x10, 0x00];
            w.writeRecordHeader(RecordTypes.BrtPageSetupView, psViewData.length);
            w.writeBytes(psViewData);
            const psData = [
                0x00, 0x00, 0x00, 0x00, 0x00, 0xE8, 0x3F, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0xE8, 0x3F, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0xF0, 0x3F, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0xF0, 0x3F, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0xE0, 0x3F, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0xE0, 0x3F
            ];
            w.writeRecordHeader(RecordTypes.BrtPageSetup, psData.length);
            w.writeBytes(psData);
        }
        getStreamingColumnCount() {
            return this.streamingColumnCount;
        }
    }

    class StylesWriter {
        constructor() {
            this.dateFormats = [];
            this.formatRegistry = new Map();
            this.nextFormatId = 164;
        }
        addDateFormat(formatCode) {
            if (this.formatRegistry.has(formatCode)) {
                return this.formatRegistry.get(formatCode);
            }
            const styleId = this.dateFormats.length + 1;
            const formatId = this.nextFormatId++;
            this.formatRegistry.set(formatCode, formatId);
            this.dateFormats.push(formatCode);
            return styleId;
        }
        toBiff12Bytes() {
            const w = new Biff12Writer();
            w.writeEmptyRecord(RecordTypes.BrtBeginCellStyleXFs);
            this.writeFormats(w);
            this.writeFonts(w);
            this.writeFills(w);
            this.writeBorders(w);
            this.writeCellStyleXFs2(w);
            this.writeStyles(w);
            w.writeEmptyRecord(RecordTypes.BrtEndCellStyleXFs);
            return w.toUint8Array();
        }
        writeFormats(w) {
            w.writeRecordHeader(RecordTypes.BrtBeginFmts, 4);
            w.writeIntLE(this.dateFormats.length);
            for (let i = 0; i < this.dateFormats.length; i++) {
                const formatCode = this.dateFormats[i];
                const formatId = this.formatRegistry.get(formatCode) || 164 + i;
                this.writeBrtFmt(w, formatId, formatCode);
            }
            w.writeEmptyRecord(RecordTypes.BrtEndFmts);
        }
        writeBrtFmt(w, formatId, formatString) {
            const strLen = formatString.length;
            const recordSize = 2 + 4 + strLen * 2;
            w.writeRecordHeader(RecordTypes.BrtFmt, recordSize);
            w.writeBytes([formatId & 0xFF, (formatId >> 8) & 0xFF]);
            w.writeIntLE(strLen);
            for (let i = 0; i < strLen; i++) {
                const code = formatString.charCodeAt(i);
                w.writeBytes([code & 0xFF, (code >> 8) & 0xFF]);
            }
        }
        writeFonts(w) {
            w.writeRecordHeader(RecordTypes.BrtBeginFonts, 4);
            w.writeIntLE(1);
            this.writeBrtFont(w);
            w.writeEmptyRecord(RecordTypes.BrtEndFonts);
        }
        writeBrtFont(w) {
            const data = [
                0xDC, 0x00, 0x00, 0x00,
                0x90, 0x01, 0x00, 0x00,
                0x00, 0x00,
                0x86, 0x00,
                0x07, 0x01,
                0x00, 0x00, 0x00, 0x00, 0x00,
                0xFF,
                0x02, 0x02, 0x00, 0x00, 0x00,
                0x8B, 0x5B, 0x53, 0x4F
            ];
            w.writeRecordHeader(RecordTypes.BrtFont, data.length);
            w.writeBytes(data);
        }
        writeFills(w) {
            w.writeRecordHeader(RecordTypes.BrtBeginFills, 4);
            w.writeIntLE(2);
            this.writeBrtFill(w, [0x00, 0x00, 0x00, 0x00]);
            this.writeBrtFill(w, [0x02, 0x00, 0x80, 0x00]);
            w.writeEmptyRecord(RecordTypes.BrtEndFills);
        }
        writeBrtFill(w, data) {
            w.writeRecordHeader(RecordTypes.BrtFill, data.length);
            w.writeBytes(data);
        }
        writeBorders(w) {
            w.writeRecordHeader(RecordTypes.BrtBeginBorders, 4);
            w.writeIntLE(1);
            const data = [];
            for (let i = 0; i < 24; i++)
                data.push(0);
            w.writeRecordHeader(RecordTypes.BrtBorder, 24);
            w.writeBytes(data);
            w.writeEmptyRecord(RecordTypes.BrtEndBorders);
        }
        writeCellStyleXFs2(w) {
            w.writeRecordHeader(RecordTypes.BrtBeginXFs, 4);
            w.writeIntLE(1);
            const data = [
                0xFF, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x08, 0x10, 0x00, 0x00
            ];
            w.writeRecordHeader(RecordTypes.BrtXF, 16);
            w.writeBytes(data);
            w.writeEmptyRecord(RecordTypes.BrtEndXFs);
        }
        writeStyles(w) {
            const count = 1 + this.dateFormats.length;
            w.writeRecordHeader(RecordTypes.BrtBeginStyles, 4);
            w.writeIntLE(count);
            this.writeStyleXF(w, 0, true);
            for (let i = 0; i < this.dateFormats.length; i++) {
                const formatCode = this.dateFormats[i];
                const formatId = this.formatRegistry.get(formatCode) || 164 + i;
                this.writeStyleXF(w, formatId, false);
            }
            w.writeEmptyRecord(RecordTypes.BrtEndStyles);
        }
        writeStyleXF(w, formatId, isFirst) {
            const data = [
                0x00, 0x00,
                formatId & 0xFF, (formatId >> 8) & 0xFF,
                0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00,
                0x08, 0x10, isFirst ? 0x00 : 0x01, 0x00
            ];
            w.writeRecordHeader(RecordTypes.BrtXF, 16);
            w.writeBytes(data);
        }
    }

    class ContentTypes {
        constructor() {
            this.overrides = [];
        }
        addOverride(partName, contentType) {
            this.overrides.push({ partName, contentType });
        }
        toXml() {
            let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
            xml += '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">';
            xml += '<Default Extension="bin" ContentType="application/vnd.ms-excel.sheet.binary.macroEnabled.main"/>';
            xml += '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>';
            xml += '<Default Extension="xml" ContentType="application/xml"/>';
            for (const o of this.overrides) {
                xml += `<Override PartName="${o.partName}" ContentType="${o.contentType}"/>`;
            }
            xml += '</Types>';
            return xml;
        }
        toUint8Array() {
            return new TextEncoder().encode(this.toXml());
        }
    }

    class RelsGenerator {
        static generateRootRels() {
            return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.bin"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
        }
        static generateWorkbookRels(sheetCount, hasSST) {
            let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
            xml += '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n';
            for (let i = 1; i <= sheetCount; i++) {
                xml += `<Relationship Id="rId${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i}.bin"/>\n`;
            }
            const nextId = sheetCount + 1;
            if (hasSST) {
                xml += `<Relationship Id="rId${nextId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.bin"/>\n`;
                xml += `<Relationship Id="rId${nextId + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.bin"/>\n`;
                xml += `<Relationship Id="rId${nextId + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>\n`;
            }
            else {
                xml += `<Relationship Id="rId${nextId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.bin"/>\n`;
                xml += `<Relationship Id="rId${nextId + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>\n`;
            }
            xml += '</Relationships>';
            return xml;
        }
        static toUint8Array(xml) {
            return new TextEncoder().encode(xml);
        }
    }

    class XmlGenerator {
        static generateAppXml(sheetCount, sheetNames) {
            let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
            xml += '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">\n';
            xml += `<Application>Microsoft Excel</Application>\n`;
            xml += `<SheetCount>${sheetCount}</SheetCount>\n`;
            if (sheetNames && sheetNames.length > 0) {
                xml += '<TitlesOfParts>\n';
                xml += '<vt:vector size="' + sheetCount + '" baseType="lpstr" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">\n';
                for (const name of sheetNames) {
                    xml += `<vt:lpstr>${this.escapeXml(name)}</vt:lpstr>\n`;
                }
                xml += '</vt:vector>\n';
                xml += '</TitlesOfParts>\n';
            }
            xml += '</Properties>';
            return xml;
        }
        static generateCoreXml() {
            const now = new Date().toISOString();
            let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
            xml += '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n';
            xml += `<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>\n`;
            xml += `<dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>\n`;
            xml += '</cp:coreProperties>';
            return xml;
        }
        static generateThemeXml() {
            return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">
<a:themeElements>
<a:clrScheme name="Office">
<a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
<a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
<a:dk2><a:srgbClr val="1F497D"/></a:dk2>
<a:lt2><a:srgbClr val="EEECE1"/></a:lt2>
<a:accent1><a:srgbClr val="4F81BD"/></a:accent1>
<a:accent2><a:srgbClr val="C0504D"/></a:accent2>
<a:accent3><a:srgbClr val="9BBB59"/></a:accent3>
<a:accent4><a:srgbClr val="8064A2"/></a:accent4>
<a:accent5><a:srgbClr val="4BACC6"/></a:accent5>
<a:accent6><a:srgbClr val="F79646"/></a:accent6>
<a:hlink><a:srgbClr val="0000FF"/></a:hlink>
<a:folHlink><a:srgbClr val="800080"/></a:folHlink>
</a:clrScheme>
<a:fontScheme name="Office">
<a:majorFont>
<a:latin typeface="Cambria"/>
<a:ea typeface=""/>
<a:cs typeface=""/>
</a:majorFont>
<a:minorFont>
<a:latin typeface="Calibri"/>
<a:ea typeface=""/>
<a:cs typeface=""/>
</a:minorFont>
</a:fontScheme>
<a:fmtScheme name="Office">
<a:fillStyleLst>
<a:noFill/>
<a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>
</a:fillStyleLst>
<a:lnStyleLst>
<a:noLn/>
</a:lnStyleLst>
<a:effectStyleLst>
<a:noEffect/>
</a:effectStyleLst>
</a:fmtScheme>
</a:themeElements>
</a:theme>`;
        }
        static toUint8Array(xml) {
            return new TextEncoder().encode(xml);
        }
        static escapeXml(str) {
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
        }
    }

    const isNode = typeof process !== 'undefined'
        && process.versions != null
        && process.versions.node != null;

    class XlsbWriter {
        constructor(options) {
            this.sheetCount = 0;
            this.currentSheetName = null;
            this.currentColumnCount = 0;
            this.currentRowCount = 0;
            this.bufferMode = false;
            this.container = new ZipWriter();
            this.sharedStrings = new SharedStringsTable();
            this.stylesWriter = new StylesWriter();
            this.workbookWriter = new WorkbookWriter();
            this.sheetWriter = new SheetWriter(this.sharedStrings, this.stylesWriter);
            if (options.path) {
                this.outputPath = options.path;
            }
            if (options.buffer) {
                this.bufferMode = true;
            }
        }
        writeBatch(sheetName, data) {
            const rowCount = data.length;
            const columnCount = rowCount > 0 ? data[0].length : 0;
            const supplier = {
                get(row, col) {
                    if (row < data.length && col < data[row].length) {
                        return data[row][col];
                    }
                    return null;
                }
            };
            this.workbookWriter.addSheet(sheetName);
            const sheetData = this.sheetWriter.writeSheet(supplier, rowCount, columnCount);
            this.container.addEntry(`xl/worksheets/sheet${this.sheetCount + 1}.bin`, sheetData);
            this.sheetCount++;
        }
        startSheet(sheetName, columnCount) {
            if (this.currentSheetName) {
                throw new Error('Previous sheet not ended, call endSheet() first');
            }
            this.currentSheetName = sheetName;
            this.currentColumnCount = columnCount;
            this.currentRowCount = 0;
            this.sheetWriter.startStreaming(columnCount);
        }
        writeRows(data) {
            if (!this.currentSheetName) {
                throw new Error('Sheet not started, call startSheet() first');
            }
            const startRow = this.currentRowCount;
            const columnCount = this.currentColumnCount;
            const supplier = {
                get(row, col) {
                    const index = row - startRow;
                    if (index >= 0 && index < data.length && col < data[index].length) {
                        return data[index][col];
                    }
                    return null;
                }
            };
            this.sheetWriter.appendRows(supplier, startRow, data.length, columnCount);
            this.currentRowCount += data.length;
        }
        endSheet() {
            if (!this.currentSheetName) {
                throw new Error('Sheet not started');
            }
            this.workbookWriter.addSheet(this.currentSheetName);
            const sheetData = this.sheetWriter.finalizeStreaming(this.currentRowCount, this.currentColumnCount);
            this.container.addEntry(`xl/worksheets/sheet${this.sheetCount + 1}.bin`, sheetData);
            this.sheetCount++;
            this.currentSheetName = null;
            this.currentColumnCount = 0;
            this.currentRowCount = 0;
        }
        close() {
            if (this.sheetCount > 0) {
                this.writeContainerStructure();
            }
            const result = this.container.toUint8Array();
            if (this.outputPath && isNode) {
                this.writeFile(result);
            }
            return result;
        }
        writeContainerStructure() {
            const ct = new ContentTypes();
            ct.addOverride('/docProps/app.xml', 'application/vnd.openxmlformats-officedocument.extended-properties+xml');
            ct.addOverride('/docProps/core.xml', 'application/vnd.openxmlformats-package.core-properties+xml');
            ct.addOverride('/xl/sharedStrings.bin', 'application/vnd.ms-excel.sharedStrings');
            ct.addOverride('/xl/styles.bin', 'application/vnd.ms-excel.styles');
            ct.addOverride('/xl/theme/theme1.xml', 'application/vnd.openxmlformats-officedocument.theme+xml');
            for (let i = 1; i <= this.sheetCount; i++) {
                ct.addOverride(`/xl/worksheets/sheet${i}.bin`, 'application/vnd.ms-excel.worksheet');
            }
            this.container.addEntry('[Content_Types].xml', ct.toUint8Array());
            this.container.addEntry('_rels/.rels', RelsGenerator.toUint8Array(RelsGenerator.generateRootRels()));
            this.container.addEntry('docProps/app.xml', XmlGenerator.toUint8Array(XmlGenerator.generateAppXml(this.sheetCount)));
            this.container.addEntry('docProps/core.xml', XmlGenerator.toUint8Array(XmlGenerator.generateCoreXml()));
            this.container.addEntry('xl/workbook.bin', this.workbookWriter.toBiff12Bytes());
            this.container.addEntry('xl/styles.bin', this.stylesWriter.toBiff12Bytes());
            this.container.addEntry('xl/theme/theme1.xml', XmlGenerator.toUint8Array(XmlGenerator.generateThemeXml()));
            this.container.addEntry('xl/_rels/workbook.bin.rels', RelsGenerator.toUint8Array(RelsGenerator.generateWorkbookRels(this.sheetCount, this.sharedStrings.getCount() > 0)));
            if (this.sharedStrings.getCount() > 0) {
                this.container.addEntry('xl/sharedStrings.bin', this.sharedStrings.toBiff12Bytes());
            }
        }
        writeFile(data) {
            if (typeof require !== 'undefined') {
                const fs = require('fs');
                if (this.outputPath) {
                    fs.writeFileSync(this.outputPath, data);
                }
            }
        }
        static builder() {
            return new XlsbWriterBuilder();
        }
    }
    class XlsbWriterBuilder {
        constructor() {
            this.options = {};
        }
        path(filePath) {
            this.options.path = filePath;
            return this;
        }
        buffer() {
            this.options.buffer = true;
            return this;
        }
        build() {
            return new XlsbWriter(this.options);
        }
    }

    class CellData {
        constructor(type, value, formatCode, styleIndex) {
            this.type = type;
            this.value = value;
            this.formatCode = formatCode;
            this.styleIndex = styleIndex;
        }
        static text(value) {
            return new CellData(exports.CellType.TEXT, value);
        }
        static number(value, formatCode) {
            return new CellData(exports.CellType.NUMBER, value, formatCode);
        }
        static date(timestamp, formatCode) {
            return new CellData(exports.CellType.DATE, timestamp, formatCode);
        }
        static bool(value) {
            return new CellData(exports.CellType.BOOLEAN, value);
        }
        static blank() {
            return new CellData(exports.CellType.BLANK, null);
        }
        static percentage(value, decimals = 2) {
            const formatCode = decimals === 0 ? '0%' : '0.' + '0'.repeat(decimals) + '%';
            return new CellData(exports.CellType.NUMBER, value, formatCode);
        }
        static time(timestamp, formatCode = 'h:mm:ss') {
            return new CellData(exports.CellType.DATE, timestamp, formatCode);
        }
        static numberNegativeRed(value) {
            return new CellData(exports.CellType.NUMBER, value, '#,##0.00;[Red]-#,##0.00');
        }
        static numberWithComma(value, decimals = 2) {
            const formatCode = decimals === 0 ? '#,##0' : '#,##0.' + '0'.repeat(decimals);
            return new CellData(exports.CellType.NUMBER, value, formatCode);
        }
        static currency(value, symbol = '￥') {
            return new CellData(exports.CellType.NUMBER, value, symbol + '#,##0.00');
        }
        isText() { return this.type === exports.CellType.TEXT; }
        isNumber() { return this.type === exports.CellType.NUMBER; }
        isBoolean() { return this.type === exports.CellType.BOOLEAN; }
        isDate() { return this.type === exports.CellType.DATE; }
        isBlank() { return this.type === exports.CellType.BLANK; }
        getTextValue() {
            return this.type === exports.CellType.TEXT ? this.value : null;
        }
        getNumberValue() {
            return this.type === exports.CellType.NUMBER ? this.value : null;
        }
        getBooleanValue() {
            return this.type === exports.CellType.BOOLEAN ? this.value : null;
        }
        getDateValue() {
            return this.type === exports.CellType.DATE ? this.value : null;
        }
        hasFormatCode() {
            return this.formatCode !== undefined && this.formatCode !== null;
        }
    }

    class ZipReader {
        constructor(buffer) {
            this.entries = [];
            this.entryMap = new Map();
            this.buffer = buffer;
            this.parse();
        }
        parse() {
            let pos = this.buffer.length - 22;
            while (pos >= 0) {
                if (this.buffer[pos] === 0x50 &&
                    this.buffer[pos + 1] === 0x4B &&
                    this.buffer[pos + 2] === 0x05 &&
                    this.buffer[pos + 3] === 0x06) {
                    break;
                }
                pos--;
            }
            if (pos < 0) {
                throw new Error('Invalid ZIP file: End of central directory not found');
            }
            const centralDirOffset = this.readUInt32LE(pos + 16);
            const entryCount = this.readUInt16LE(pos + 8);
            let entryPos = centralDirOffset;
            for (let i = 0; i < entryCount; i++) {
                if (this.buffer[entryPos] !== 0x50 ||
                    this.buffer[entryPos + 1] !== 0x4B ||
                    this.buffer[entryPos + 2] !== 0x01 ||
                    this.buffer[entryPos + 3] !== 0x02) {
                    throw new Error('Invalid central directory entry');
                }
                const compressedSize = this.readUInt32LE(entryPos + 20);
                const uncompressedSize = this.readUInt32LE(entryPos + 24);
                const nameLength = this.readUInt16LE(entryPos + 28);
                const extraLength = this.readUInt16LE(entryPos + 30);
                const commentLength = this.readUInt16LE(entryPos + 32);
                const localHeaderOffset = this.readUInt32LE(entryPos + 42);
                const nameStart = entryPos + 46;
                const name = this.decodeString(nameStart, nameLength);
                const compressionMethod = this.readUInt16LE(localHeaderOffset + 8);
                const entry = {
                    name,
                    compressedSize,
                    uncompressedSize,
                    offset: localHeaderOffset,
                    compressionMethod
                };
                this.entries.push(entry);
                this.entryMap.set(name, entry);
                entryPos += 46 + nameLength + extraLength + commentLength;
            }
        }
        getEntry(name) {
            return this.entryMap.get(name) || null;
        }
        getEntryData(name) {
            const entry = this.entryMap.get(name);
            if (!entry)
                return null;
            const localHeaderPos = entry.offset;
            if (this.buffer[localHeaderPos] !== 0x50 ||
                this.buffer[localHeaderPos + 1] !== 0x4B ||
                this.buffer[localHeaderPos + 2] !== 0x03 ||
                this.buffer[localHeaderPos + 3] !== 0x04) {
                throw new Error('Invalid local file header');
            }
            const nameLength = this.readUInt16LE(localHeaderPos + 26);
            const extraLength = this.readUInt16LE(localHeaderPos + 28);
            const dataStart = localHeaderPos + 30 + nameLength + extraLength;
            const compressedData = this.buffer.slice(dataStart, dataStart + entry.compressedSize);
            if (entry.compressionMethod === 0) {
                return compressedData;
            }
            return this.decompress(compressedData, entry.uncompressedSize);
        }
        getAllEntryNames() {
            return this.entries.map(e => e.name);
        }
        decompress(data, expectedSize) {
            if (typeof require !== 'undefined') {
                try {
                    const zlib = require('zlib');
                    const result = zlib.inflateRawSync(Buffer.from(data));
                    return new Uint8Array(result);
                }
                catch (e) {
                }
            }
            return this.decompressPureJS(data, expectedSize);
        }
        decompressPureJS(data, expectedSize) {
            const result = [];
            let pos = 0;
            while (pos < data.length && result.length < expectedSize) {
                const bfinal = data[pos] & 1;
                const btype = (data[pos] >> 1) & 3;
                pos++;
                if (btype === 0) {
                    pos += 2;
                    const len = data[pos] | (data[pos + 1] << 8);
                    pos += 2;
                    for (let i = 0; i < len && result.length < expectedSize; i++) {
                        result.push(data[pos + i]);
                    }
                    pos += len;
                }
                else if (btype === 2) {
                    pos = this.parseDynamicHuffman(data, pos, result, expectedSize);
                }
                else {
                    throw new Error('Unsupported compression: btype=' + btype);
                }
                if (bfinal === 1)
                    break;
            }
            return new Uint8Array(result);
        }
        parseDynamicHuffman(data, pos, result, maxLen) {
            const hlit = (data[pos] | (data[pos + 1] << 8) | ((data[pos + 2] << 16))) & 0x1F;
            const hdist = ((data[pos] >> 5) | (data[pos + 1] << 3)) & 0x1F;
            const hclen = (data[pos + 2] >> 4) & 0x0F;
            pos += 3;
            for (let i = 0; i < 19; i++) {
                i <= hclen + 3 ? (data[pos] & 7) : 0;
                if (i <= hclen + 3)
                    pos++;
                else
                    pos += Math.ceil((hclen + 4) / 8) * 8 / 8;
            }
            pos = this.buildHuffmanTables(data, pos, hlit, hdist, result, maxLen);
            return pos;
        }
        buildHuffmanTables(data, pos, hlit, hdist, result, maxLen) {
            while (result.length < maxLen && pos < data.length) {
                const byte = data[pos];
                pos++;
                if (byte < 256) {
                    result.push(byte);
                }
                else if (byte === 256) {
                    break;
                }
                else {
                    const lenCode = byte - 257;
                    const lenExtraBits = this.getLengthExtraBits(lenCode);
                    const lenBase = this.getLengthBase(lenCode);
                    let extra = 0;
                    for (let i = 0; i < lenExtraBits && pos < data.length; i++) {
                        extra |= ((data[pos++] & 1) << i);
                    }
                    const length = lenBase + extra;
                    const distByte = data[pos++];
                    const distExtraBits = this.getDistanceExtraBits(distByte);
                    const distBase = this.getDistanceBase(distByte);
                    extra = 0;
                    for (let i = 0; i < distExtraBits && pos < data.length; i++) {
                        extra |= ((data[pos++] & 1) << i);
                    }
                    const distance = distBase + extra;
                    for (let i = 0; i < length && result.length < maxLen; i++) {
                        const srcIdx = result.length - distance;
                        if (srcIdx >= 0 && srcIdx < result.length) {
                            result.push(result[srcIdx]);
                        }
                    }
                }
            }
            return pos;
        }
        getLengthBase(code) {
            const bases = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
            return bases[code] || 0;
        }
        getLengthExtraBits(code) {
            const bits = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
            return bits[code] || 0;
        }
        getDistanceBase(code) {
            const bases = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
            return bases[code] || 0;
        }
        getDistanceExtraBits(code) {
            const bits = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
            return bits[code] || 0;
        }
        readUInt16LE(offset) {
            return this.buffer[offset] | (this.buffer[offset + 1] << 8);
        }
        readUInt32LE(offset) {
            return this.buffer[offset] |
                (this.buffer[offset + 1] << 8) |
                (this.buffer[offset + 2] << 16) |
                (this.buffer[offset + 3] << 24);
        }
        decodeString(offset, length) {
            const chars = [];
            for (let i = 0; i < length; i++) {
                chars.push(String.fromCharCode(this.buffer[offset + i]));
            }
            return chars.join('');
        }
    }

    class WorkbookReader {
        constructor(buffer) {
            this.buffer = buffer;
        }
        parseSheetList() {
            const sheets = [];
            let pos = 0;
            while (pos + 2 <= this.buffer.length) {
                const recordType = readVarInt(this.buffer, pos);
                const typeSize = varIntSize(recordType);
                pos += typeSize;
                if (pos >= this.buffer.length)
                    break;
                const recordSize = readVarSize(this.buffer, pos);
                const sizeBytes = varSizeSize(recordSize);
                pos += sizeBytes;
                if (recordSize > 0 && pos + recordSize > this.buffer.length) {
                    break;
                }
                if (recordType === RecordTypes.BrtBundleSh) {
                    const info = this.parseBrtBundleSh(pos, recordSize);
                    if (info) {
                        sheets.push(info);
                    }
                }
                pos += recordSize;
            }
            return sheets;
        }
        parseBrtBundleSh(offset, size) {
            let pos = offset;
            pos += 4;
            const iTabId = readIntLE(this.buffer, pos);
            pos += 4;
            const relId = this.readXLWideString(pos);
            pos += 4 + relId.length * 2;
            const name = this.readXLWideString(pos);
            return { name, index: iTabId - 1, path: '' };
        }
        readXLWideString(offset) {
            const length = readIntLE(this.buffer, offset);
            if (length === 0)
                return '';
            return decodeUTF16LE(this.buffer, offset + 4, length);
        }
    }

    class BatchCompleteException extends Error {
        constructor() {
            super('Batch complete');
            this.name = 'BatchCompleteException';
        }
    }
    class SheetReader {
        constructor(buffer, sst) {
            this.currentRow = -1;
            this.currentHandler = null;
            this.buffer = buffer;
            this.sst = sst;
        }
        readRows(handler) {
            let pos = 0;
            try {
                while (pos + 2 <= this.buffer.length) {
                    const recordType = readVarInt(this.buffer, pos);
                    const typeSize = varIntSize(recordType);
                    pos += typeSize;
                    if (pos >= this.buffer.length)
                        break;
                    const recordSize = readVarSize(this.buffer, pos);
                    const sizeBytes = varSizeSize(recordSize);
                    pos += sizeBytes;
                    if (recordSize < 0 || recordSize > this.buffer.length) {
                        pos += Math.max(0, recordSize);
                        continue;
                    }
                    if (recordSize > 0 && pos + recordSize > this.buffer.length) {
                        break;
                    }
                    try {
                        switch (recordType) {
                            case RecordTypes.BrtRowHdr:
                                this.handleBrtRowHdr(pos, recordSize, handler);
                                break;
                            case RecordTypes.BrtCellRk:
                                this.handleBrtCellRk(pos, recordSize, handler);
                                break;
                            case RecordTypes.BrtCellReal:
                                this.handleBrtCellReal(pos, recordSize, handler);
                                break;
                            case RecordTypes.BrtCellSt:
                                this.handleBrtCellSt(pos, recordSize, handler);
                                break;
                            case RecordTypes.BrtCellBool:
                                this.handleBrtCellBool(pos, recordSize, handler);
                                break;
                            case RecordTypes.BrtCellBlank:
                                this.handleBrtCellBlank(pos, recordSize, handler);
                                break;
                            case RecordTypes.BrtCellIsst:
                                this.handleBrtCellIsst(pos, recordSize, handler);
                                break;
                        }
                        pos += recordSize;
                    }
                    catch (e) {
                        if (e instanceof BatchCompleteException) {
                            throw e;
                        }
                        pos += recordSize;
                    }
                }
                if (this.currentRow >= 0 && this.currentHandler) {
                    this.currentHandler.onRowEnd(this.currentRow);
                }
            }
            catch (e) {
                if (e instanceof BatchCompleteException) {
                    if (this.currentRow >= 0 && this.currentHandler) {
                        this.currentHandler.onRowEnd(this.currentRow);
                    }
                }
                else {
                    throw e;
                }
            }
        }
        handleBrtRowHdr(offset, size, handler) {
            if (this.currentRow >= 0 && this.currentHandler) {
                this.currentHandler.onRowEnd(this.currentRow);
            }
            if (size < 4)
                return;
            this.currentRow = readIntLE(this.buffer, offset);
            this.currentHandler = handler;
            let numSpans = 0;
            if (size >= 17) {
                numSpans = readIntLE(this.buffer, offset + 13);
            }
            let lastCol = 0;
            if (numSpans > 0 && size >= 17 + numSpans * 8) {
                const lastSpanOffset = offset + 17 + (numSpans - 1) * 8;
                lastCol = readIntLE(this.buffer, lastSpanOffset + 4);
            }
            const columnCount = Math.max(1, lastCol + 1);
            handler.onRowStart(this.currentRow, columnCount);
        }
        handleBrtCellRk(offset, size, handler) {
            const col = readIntLE(this.buffer, offset);
            const rkValue = readIntLE(this.buffer, offset + 8);
            const value = this.decodeRk(rkValue);
            handler.onCellNumber(this.currentRow, col, value);
        }
        handleBrtCellReal(offset, size, handler) {
            const col = readIntLE(this.buffer, offset);
            const value = readDoubleLE(this.buffer, offset + 8);
            handler.onCellNumber(this.currentRow, col, value);
        }
        handleBrtCellSt(offset, size, handler) {
            const col = readIntLE(this.buffer, offset);
            const sstIndex = readIntLE(this.buffer, offset + 8);
            const value = this.sst.getString(sstIndex);
            handler.onCellText(this.currentRow, col, value);
        }
        handleBrtCellBool(offset, size, handler) {
            const col = readIntLE(this.buffer, offset);
            const value = this.buffer[offset + 8] !== 0;
            handler.onCellBoolean(this.currentRow, col, value);
        }
        handleBrtCellBlank(offset, size, handler) {
            const col = readIntLE(this.buffer, offset);
            handler.onCellBlank(this.currentRow, col);
        }
        handleBrtCellIsst(offset, size, handler) {
            if (size < 12)
                return;
            const col = readIntLE(this.buffer, offset);
            const sstIndex = readIntLE(this.buffer, offset + 8);
            const value = this.sst.getString(sstIndex);
            handler.onCellText(this.currentRow, col, value || '');
        }
        decodeRk(rkValue) {
            const isInt = (rkValue & 1) !== 0;
            const div100 = (rkValue & 2) !== 0;
            const valueBits = rkValue & 0xFFFFFFFC;
            let value;
            if (isInt) {
                value = valueBits >> 2;
            }
            else {
                const buffer = new ArrayBuffer(8);
                const view = new DataView(buffer);
                view.setInt32(4, valueBits, true);
                view.setInt32(0, 0, true);
                value = view.getFloat64(0, true);
            }
            if (div100) {
                value = value / 100.0;
            }
            return value;
        }
    }

    class XlsbReader {
        constructor(buffer) {
            this.buffer = buffer;
            this.container = new ZipReader(buffer);
            this.sst = this.loadSharedStringsTable();
        }
        loadSharedStringsTable() {
            const sstBuffer = this.container.getEntryData('xl/sharedStrings.bin');
            const table = new SharedStringsTable();
            if (sstBuffer) {
                table.load(sstBuffer);
            }
            return table;
        }
        getSheetInfos() {
            const workbookBuffer = this.container.getEntryData('xl/workbook.bin');
            if (!workbookBuffer) {
                throw new Error('workbook.bin not found');
            }
            const reader = new WorkbookReader(workbookBuffer);
            return reader.parseSheetList();
        }
        forEachRow(sheetIndex, handler) {
            const sheetBuffer = this.getSheetBuffer(sheetIndex);
            const sheetReader = new SheetReader(sheetBuffer, this.sst);
            sheetReader.readRows({
                onRowStart(rowIndex, columnCount) {
                    handler.onRowStart(rowIndex, columnCount);
                },
                onCellNumber(row, col, value) {
                    handler.onCell(row, col, CellData.number(value));
                },
                onCellText(row, col, value) {
                    handler.onCell(row, col, CellData.text(value));
                },
                onCellBoolean(row, col, value) {
                    handler.onCell(row, col, CellData.bool(value));
                },
                onCellBlank(row, col) {
                    handler.onCell(row, col, CellData.blank());
                },
                onRowEnd(rowIndex) {
                    handler.onRowEnd(rowIndex);
                }
            });
        }
        readRows(sheetIndex, startRow, batchSize) {
            const endRow = startRow + batchSize - 1;
            const result = [];
            let currentRowData = [];
            let maxColInRow = -1;
            const estimatedColumns = 100;
            const sheetBuffer = this.getSheetBuffer(sheetIndex);
            const sheetReader = new SheetReader(sheetBuffer, this.sst);
            try {
                sheetReader.readRows({
                    onRowStart(rowIndex, colCount) {
                        if (rowIndex >= startRow && rowIndex <= endRow) {
                            const actualColCount = Math.max(colCount, estimatedColumns);
                            currentRowData = new Array(actualColCount).fill(null);
                            maxColInRow = -1;
                        }
                        else if (rowIndex > endRow) {
                            throw new BatchCompleteException();
                        }
                    },
                    onCellNumber(row, col, value) {
                        if (row >= startRow && row <= endRow) {
                            if (col >= currentRowData.length) {
                                const newData = new Array(col + 1).fill(null);
                                for (let i = 0; i < currentRowData.length; i++) {
                                    newData[i] = currentRowData[i];
                                }
                                currentRowData = newData;
                            }
                            currentRowData[col] = CellData.number(value);
                            maxColInRow = Math.max(maxColInRow, col);
                        }
                    },
                    onCellText(row, col, value) {
                        if (row >= startRow && row <= endRow) {
                            if (col >= currentRowData.length) {
                                const newData = new Array(col + 1).fill(null);
                                for (let i = 0; i < currentRowData.length; i++) {
                                    newData[i] = currentRowData[i];
                                }
                                currentRowData = newData;
                            }
                            currentRowData[col] = CellData.text(value);
                            maxColInRow = Math.max(maxColInRow, col);
                        }
                    },
                    onCellBoolean(row, col, value) {
                        if (row >= startRow && row <= endRow) {
                            if (col >= currentRowData.length) {
                                const newData = new Array(col + 1).fill(null);
                                for (let i = 0; i < currentRowData.length; i++) {
                                    newData[i] = currentRowData[i];
                                }
                                currentRowData = newData;
                            }
                            currentRowData[col] = CellData.bool(value);
                            maxColInRow = Math.max(maxColInRow, col);
                        }
                    },
                    onCellBlank(row, col) {
                        if (row >= startRow && row <= endRow) {
                            if (col >= currentRowData.length) {
                                const newData = new Array(col + 1).fill(null);
                                for (let i = 0; i < currentRowData.length; i++) {
                                    newData[i] = currentRowData[i];
                                }
                                currentRowData = newData;
                            }
                            currentRowData[col] = CellData.blank();
                            maxColInRow = Math.max(maxColInRow, col);
                        }
                    },
                    onRowEnd(rowIndex) {
                        if (rowIndex >= startRow && rowIndex <= endRow) {
                            if (maxColInRow >= 0) {
                                const trimmed = currentRowData.slice(0, maxColInRow + 1);
                                result.push(trimmed);
                            }
                            else {
                                result.push([]);
                            }
                        }
                        if (rowIndex >= endRow) {
                            throw new BatchCompleteException();
                        }
                    }
                });
            }
            catch (e) {
                if (!(e instanceof BatchCompleteException)) {
                    throw e;
                }
            }
            return result;
        }
        getSheetBuffer(sheetIndex) {
            const sheetPath = `xl/worksheets/sheet${sheetIndex + 1}.bin`;
            const buffer = this.container.getEntryData(sheetPath);
            if (!buffer) {
                throw new Error(`Sheet ${sheetIndex} not found: ${sheetPath}`);
            }
            return buffer;
        }
        hasSharedStrings() {
            return this.sst.getCount() > 0;
        }
        close() {
        }
        static builder() {
            return new XlsbReaderBuilder();
        }
        static async fromFile(file) {
            const buffer = await file.arrayBuffer();
            return new XlsbReader(new Uint8Array(buffer));
        }
    }
    class XlsbReaderBuilder {
        constructor() {
            this.options = {};
        }
        path(filePath) {
            this.options.path = filePath;
            return this;
        }
        buffer(data) {
            this.options.buffer = data;
            return this;
        }
        build() {
            if (this.options.buffer) {
                return new XlsbReader(this.options.buffer);
            }
            if (this.options.path && typeof require !== 'undefined') {
                const fs = require('fs');
                const data = fs.readFileSync(this.options.path);
                return new XlsbReader(new Uint8Array(data));
            }
            throw new Error('Either path or buffer must be specified');
        }
    }

    class Biff12Reader {
        constructor(buffer) {
            this.offset = 0;
            this.buffer = buffer;
        }
        hasNext() {
            return this.offset < this.buffer.length - 2;
        }
        nextRecord() {
            if (!this.hasNext()) {
                return null;
            }
            const recordType = readVarInt(this.buffer, this.offset);
            const typeSize = varIntSize(recordType);
            this.offset += typeSize;
            const recordSize = readVarSize(this.buffer, this.offset);
            const sizeBytes = varSizeSize(recordSize);
            this.offset += sizeBytes;
            if (this.offset + recordSize > this.buffer.length) {
                return null;
            }
            const data = this.buffer.slice(this.offset, this.offset + recordSize);
            this.offset += recordSize;
            return { type: recordType, size: recordSize, data };
        }
        readAllRecords() {
            const records = [];
            while (this.hasNext()) {
                const record = this.nextRecord();
                if (record) {
                    records.push(record);
                }
            }
            return records;
        }
        getOffset() {
            return this.offset;
        }
        setOffset(offset) {
            this.offset = offset;
        }
    }

    const defaultHtmlConfig = {
        maxRows: 1000,
        maxColumns: 50,
        showHeader: true,
        stickyHeader: true,
        cellWidth: 100,
        theme: 'light',
        customStyles: {}
    };

    const defaultStyles = {
        table: {
            'border-collapse': 'collapse',
            'width': '100%',
            'font-family': 'Arial, sans-serif',
            'font-size': '12px'
        },
        header: {
            'background-color': '#f0f0f0',
            'font-weight': 'bold',
            'border': '1px solid #d0d0d0',
            'padding': '4px 8px',
            'text-align': 'center'
        },
        cell: {
            'border': '1px solid #d0d0d0',
            'padding': '4px 8px',
            'text-align': 'left'
        },
        numberCell: {
            'text-align': 'right'
        },
        darkTheme: {
            table: {
                'background-color': '#1a1a1a',
                'color': '#ffffff'
            }}
    };
    function applyStyles(element, styles) {
        for (const [key, value] of Object.entries(styles)) {
            element.style[key] = value;
        }
    }

    class HtmlRenderer {
        constructor(config) {
            this.customStyles = {};
            this.config = { ...defaultHtmlConfig, ...config };
        }
        render(reader, sheetIndex, config) {
            const finalConfig = { ...this.config, ...config };
            const self = this;
            const table = document.createElement('table');
            table.className = `jsxlsb-table jsxlsb-theme-${finalConfig.theme}`;
            if (finalConfig.theme === 'dark') {
                applyStyles(table, { ...defaultStyles.table, ...defaultStyles.darkTheme.table });
            }
            else {
                applyStyles(table, defaultStyles.table);
            }
            const thead = document.createElement('thead');
            thead.className = 'jsxlsb-header';
            if (finalConfig.stickyHeader) {
                thead.style.position = 'sticky';
                thead.style.top = '0';
            }
            if (finalConfig.showHeader) {
                const headerRow = document.createElement('tr');
                headerRow.className = 'jsxlsb-header-row';
                const cornerCell = document.createElement('th');
                cornerCell.className = 'jsxlsb-corner-cell';
                applyStyles(cornerCell, defaultStyles.header);
                headerRow.appendChild(cornerCell);
                for (let col = 0; col < finalConfig.maxColumns; col++) {
                    const colHeader = document.createElement('th');
                    colHeader.className = 'jsxlsb-col-header';
                    colHeader.textContent = self.columnToLetter(col);
                    applyStyles(colHeader, defaultStyles.header);
                    colHeader.style.width = `${finalConfig.cellWidth}px`;
                    headerRow.appendChild(colHeader);
                }
                thead.appendChild(headerRow);
            }
            table.appendChild(thead);
            const tbody = document.createElement('tbody');
            tbody.className = 'jsxlsb-body';
            let rowCount = 0;
            reader.forEachRow(sheetIndex, {
                onRowStart(rowIndex, columnCount) {
                    if (rowCount >= finalConfig.maxRows)
                        return;
                    const tr = document.createElement('tr');
                    tr.className = 'jsxlsb-row';
                    tr.dataset.row = String(rowIndex);
                    const rowHeader = document.createElement('td');
                    rowHeader.className = 'jsxlsb-row-header';
                    rowHeader.textContent = String(rowIndex + 1);
                    applyStyles(rowHeader, defaultStyles.header);
                    tr.appendChild(rowHeader);
                    tbody.appendChild(tr);
                },
                onCell(row, col, cellData) {
                    if (rowCount >= finalConfig.maxRows)
                        return;
                    if (col >= finalConfig.maxColumns)
                        return;
                    const rows = tbody.querySelectorAll('.jsxlsb-row');
                    const tr = rows[rows.length - 1];
                    if (!tr)
                        return;
                    const td = document.createElement('td');
                    td.className = 'jsxlsb-cell';
                    td.dataset.row = String(row);
                    td.dataset.col = String(col);
                    applyStyles(td, defaultStyles.cell);
                    if (cellData.isNumber()) {
                        applyStyles(td, defaultStyles.numberCell);
                        td.textContent = self.formatNumber(cellData.getNumberValue(), cellData.formatCode);
                    }
                    else if (cellData.isText()) {
                        td.textContent = cellData.getTextValue() || '';
                    }
                    else if (cellData.isBoolean()) {
                        td.textContent = cellData.getBooleanValue() ? 'TRUE' : 'FALSE';
                    }
                    else if (cellData.isDate()) {
                        const timestamp = cellData.getDateValue();
                        const date = new Date(timestamp);
                        td.textContent = date.toLocaleDateString();
                    }
                    else {
                        td.textContent = '';
                    }
                    td.style.width = `${finalConfig.cellWidth}px`;
                    tr.appendChild(td);
                },
                onRowEnd(rowIndex) {
                    rowCount++;
                }
            });
            table.appendChild(tbody);
            return table;
        }
        renderTo(container, reader, sheetIndex, config) {
            const table = this.render(reader, sheetIndex, config);
            container.appendChild(table);
        }
        setStyles(styles) {
            this.customStyles = styles;
        }
        columnToLetter(col) {
            const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            if (col < 26) {
                return letters[col];
            }
            const firstLetter = Math.floor(col / 26) - 1;
            const secondLetter = col % 26;
            return letters[firstLetter] + letters[secondLetter];
        }
        formatNumber(value, formatCode) {
            if (formatCode) {
                if (formatCode.includes('%')) {
                    return (value * 100).toFixed(2) + '%';
                }
                if (formatCode.includes('#,##0')) {
                    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                }
                if (formatCode.includes('￥') || formatCode.includes('$')) {
                    return formatCode.replace(/^[￥$]/, '') + value.toLocaleString('en-US', { minimumFractionDigits: 2 });
                }
            }
            return String(value);
        }
    }

    const defaultCanvasConfig = {
        cellWidth: 80,
        cellHeight: 24,
        headerWidth: 40,
        headerHeight: 24,
        fontFamily: 'Arial',
        fontSize: 12,
        borderColor: '#d0d0d0',
        backgroundColor: '#ffffff',
        headerBackgroundColor: '#f0f0f0',
        textColor: '#333333',
        maxRenderRows: 10000,
        maxRenderColumns: 100
    };

    class CanvasRenderer {
        constructor(config) {
            this.canvas = null;
            this.ctx = null;
            this.reader = null;
            this.sheetIndex = 0;
            this.viewport = { startRow: 0, endRow: 50, startCol: 0, endCol: 30 };
            this.cellCache = {};
            this.zoom = 1;
            this.maxRow = 0;
            this.maxCol = 0;
            this.scrollY = 0;
            this.scrollX = 0;
            this.config = { ...defaultCanvasConfig, ...config };
        }
        render(canvas, reader, sheetIndex, config) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.reader = reader;
            this.sheetIndex = sheetIndex;
            if (config) {
                this.config = { ...this.config, ...config };
            }
            this.calculateDimensions();
            this.loadCellData();
            this.draw();
            this.setupScrollHandler();
        }
        calculateDimensions() {
            if (!this.canvas)
                return;
            const width = this.canvas.width;
            const height = this.canvas.height;
            const visibleCols = Math.floor((width - this.config.headerWidth) / (this.config.cellWidth * this.zoom));
            const visibleRows = Math.floor((height - this.config.headerHeight) / (this.config.cellHeight * this.zoom));
            this.viewport = {
                startRow: 0,
                endRow: Math.min(visibleRows, this.config.maxRenderRows),
                startCol: 0,
                endCol: Math.min(visibleCols, this.config.maxRenderColumns)
            };
        }
        loadCellData() {
            if (!this.reader)
                return;
            const self = this;
            this.cellCache = {};
            this.maxRow = 0;
            this.maxCol = 0;
            this.reader.forEachRow(this.sheetIndex, {
                onRowStart(rowIndex, columnCount) { },
                onCell(row, col, cellData) {
                    self.cellCache[`${row}_${col}`] = cellData;
                    self.maxRow = Math.max(self.maxRow, row);
                    self.maxCol = Math.max(self.maxCol, col);
                },
                onRowEnd(rowIndex) { }
            });
        }
        draw() {
            if (!this.ctx || !this.canvas)
                return;
            const ctx = this.ctx;
            const width = this.canvas.width;
            const height = this.canvas.height;
            ctx.fillStyle = this.config.backgroundColor;
            ctx.fillRect(0, 0, width, height);
            this.drawHeader(ctx);
            this.drawCells(ctx);
            this.drawGrid(ctx);
        }
        drawHeader(ctx) {
            ctx.fillStyle = this.config.headerBackgroundColor;
            ctx.fillRect(0, 0, this.config.headerWidth, this.config.headerHeight);
            ctx.fillRect(this.config.headerWidth, 0, this.canvas.width - this.config.headerWidth, this.config.headerHeight);
            ctx.fillRect(0, this.config.headerHeight, this.config.headerWidth, this.canvas.height - this.config.headerHeight);
            ctx.fillStyle = this.config.textColor;
            ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            for (let col = this.viewport.startCol; col <= this.viewport.endCol; col++) {
                const x = this.config.headerWidth + (col - this.viewport.startCol) * this.config.cellWidth * this.zoom + this.config.cellWidth * this.zoom / 2;
                ctx.fillText(this.columnToLetter(col), x, this.config.headerHeight / 2);
            }
            ctx.textAlign = 'right';
            for (let row = this.viewport.startRow; row <= this.viewport.endRow; row++) {
                const y = this.config.headerHeight + (row - this.viewport.startRow) * this.config.cellHeight * this.zoom + this.config.cellHeight * this.zoom / 2;
                ctx.fillText(String(row + 1), this.config.headerWidth - 4, y);
            }
        }
        drawCells(ctx) {
            ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;
            for (let row = this.viewport.startRow; row <= this.viewport.endRow; row++) {
                for (let col = this.viewport.startCol; col <= this.viewport.endCol; col++) {
                    const cellData = this.cellCache[`${row}_${col}`];
                    if (!cellData)
                        continue;
                    const x = this.config.headerWidth + (col - this.viewport.startCol) * this.config.cellWidth * this.zoom;
                    const y = this.config.headerHeight + (row - this.viewport.startRow) * this.config.cellHeight * this.zoom;
                    ctx.fillStyle = this.config.textColor;
                    ctx.textBaseline = 'middle';
                    const text = this.formatCellText(cellData);
                    if (cellData.isNumber()) {
                        ctx.textAlign = 'right';
                        ctx.fillText(text, x + this.config.cellWidth * this.zoom - 4, y + this.config.cellHeight * this.zoom / 2);
                    }
                    else {
                        ctx.textAlign = 'left';
                        ctx.fillText(text, x + 4, y + this.config.cellHeight * this.zoom / 2);
                    }
                }
            }
        }
        drawGrid(ctx) {
            ctx.strokeStyle = this.config.borderColor;
            ctx.lineWidth = 1;
            const startX = this.config.headerWidth;
            const startY = this.config.headerHeight;
            for (let col = this.viewport.startCol; col <= this.viewport.endCol + 1; col++) {
                const x = startX + (col - this.viewport.startCol) * this.config.cellWidth * this.zoom;
                ctx.beginPath();
                ctx.moveTo(x, startY);
                ctx.lineTo(x, this.canvas.height);
                ctx.stroke();
            }
            for (let row = this.viewport.startRow; row <= this.viewport.endRow + 1; row++) {
                const y = startY + (row - this.viewport.startRow) * this.config.cellHeight * this.zoom;
                ctx.beginPath();
                ctx.moveTo(startX, y);
                ctx.lineTo(this.canvas.width, y);
                ctx.stroke();
            }
        }
        setupScrollHandler() {
            if (!this.canvas)
                return;
            this.canvas.addEventListener('wheel', (e) => {
                e.preventDefault();
                const deltaY = e.deltaY > 0 ? 1 : -1;
                const deltaX = e.deltaX > 0 ? 1 : -1;
                const newRow = Math.max(0, Math.min(this.viewport.startRow + deltaY, this.maxRow - this.viewport.endRow + this.viewport.startRow));
                const newCol = Math.max(0, Math.min(this.viewport.startCol + deltaX, this.maxCol - this.viewport.endCol + this.viewport.startCol));
                if (newRow !== this.viewport.startRow || newCol !== this.viewport.startCol) {
                    this.viewport.startRow = newRow;
                    this.viewport.endRow = newRow + (this.viewport.endRow - this.viewport.startRow);
                    this.viewport.startCol = newCol;
                    this.viewport.endCol = newCol + (this.viewport.endCol - this.viewport.startCol);
                    this.draw();
                }
            });
        }
        setZoom(zoom) {
            this.zoom = Math.max(0.5, Math.min(3, zoom));
            this.calculateDimensions();
            this.draw();
        }
        scrollTo(row, col) {
            this.viewport.startRow = Math.max(0, row);
            this.viewport.startCol = Math.max(0, col);
            this.calculateDimensions();
            this.draw();
        }
        destroy() {
            if (this.canvas) {
                this.canvas.removeEventListener('wheel', this.setupScrollHandler);
            }
            this.canvas = null;
            this.ctx = null;
            this.reader = null;
            this.cellCache = {};
        }
        columnToLetter(col) {
            const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            if (col < 26) {
                return letters[col];
            }
            const firstLetter = Math.floor(col / 26) - 1;
            const secondLetter = col % 26;
            return letters[firstLetter] + letters[secondLetter];
        }
        formatCellText(cellData) {
            if (cellData.isNumber()) {
                const value = cellData.getNumberValue();
                const formatCode = cellData.formatCode;
                if (formatCode) {
                    if (formatCode.includes('%')) {
                        return (value * 100).toFixed(2) + '%';
                    }
                    if (formatCode.includes('#,##0')) {
                        return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    }
                }
                return String(value);
            }
            if (cellData.isText()) {
                return cellData.getTextValue() || '';
            }
            if (cellData.isBoolean()) {
                return cellData.getBooleanValue() ? 'TRUE' : 'FALSE';
            }
            if (cellData.isDate()) {
                const timestamp = cellData.getDateValue();
                return new Date(timestamp).toLocaleDateString();
            }
            return '';
        }
    }

    const version = '1.0.0';

    exports.Biff12Reader = Biff12Reader;
    exports.Biff12Writer = Biff12Writer;
    exports.CanvasRenderer = CanvasRenderer;
    exports.CellData = CellData;
    exports.HtmlRenderer = HtmlRenderer;
    exports.SharedStringsTable = SharedStringsTable;
    exports.XlsbReader = XlsbReader;
    exports.XlsbWriter = XlsbWriter;
    exports.ZipReader = ZipReader;
    exports.ZipWriter = ZipWriter;
    exports.version = version;

}));

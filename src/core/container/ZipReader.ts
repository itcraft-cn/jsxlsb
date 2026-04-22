export interface ZipEntryInfo {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
  offset: number;
  compressionMethod: number;
}

export class ZipReader {
  private buffer: Uint8Array;
  private entries: ZipEntryInfo[] = [];
  private entryMap: Map<string, ZipEntryInfo> = new Map();

  constructor(buffer: Uint8Array) {
    this.buffer = buffer;
    this.parse();
  }

  private parse(): void {
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

      const entry: ZipEntryInfo = {
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

  getEntry(name: string): ZipEntryInfo | null {
    return this.entryMap.get(name) || null;
  }

  getEntryData(name: string): Uint8Array | null {
    const entry = this.entryMap.get(name);
    if (!entry) return null;

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

  getAllEntryNames(): string[] {
    return this.entries.map(e => e.name);
  }

  private decompress(data: Uint8Array, expectedSize: number): Uint8Array {
    if (typeof require !== 'undefined') {
      try {
        const zlib = require('zlib');
        const result = zlib.inflateRawSync(Buffer.from(data));
        return new Uint8Array(result);
      } catch (e) {
      }
    }

    return this.decompressPureJS(data, expectedSize);
  }

  private decompressPureJS(data: Uint8Array, expectedSize: number): Uint8Array {
    const result: number[] = [];
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
      } else if (btype === 2) {
        pos = this.parseDynamicHuffman(data, pos, result, expectedSize);
      } else {
        throw new Error('Unsupported compression: btype=' + btype);
      }

      if (bfinal === 1) break;
    }

    return new Uint8Array(result);
  }

  private parseDynamicHuffman(data: Uint8Array, pos: number, result: number[], maxLen: number): number {
    const hlit = (data[pos] | (data[pos + 1] << 8) | ((data[pos + 2] << 16))) & 0x1F;
    const hdist = ((data[pos] >> 5) | (data[pos + 1] << 3)) & 0x1F;
    const hclen = (data[pos + 2] >> 4) & 0x0F;
    pos += 3;

    const codeLengthOrder = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
    const codeLengths: number[] = [];
    for (let i = 0; i < 19; i++) {
      codeLengths[codeLengthOrder[i]] = i <= hclen + 3 ? (data[pos] & 7) : 0;
      if (i <= hclen + 3) pos++;
      else pos += Math.ceil((hclen + 4) / 8) * 8 / 8;
    }

    pos = this.buildHuffmanTables(data, pos, hlit, hdist, result, maxLen);

    return pos;
  }

  private buildHuffmanTables(data: Uint8Array, pos: number, hlit: number, hdist: number, result: number[], maxLen: number): number {
    const litCount = hlit + 257;
    const distCount = hdist + 1;

    while (result.length < maxLen && pos < data.length) {
      const byte = data[pos];
      pos++;

      if (byte < 256) {
        result.push(byte);
      } else if (byte === 256) {
        break;
      } else {
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

  private getLengthBase(code: number): number {
    const bases = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
    return bases[code] || 0;
  }

  private getLengthExtraBits(code: number): number {
    const bits = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
    return bits[code] || 0;
  }

  private getDistanceBase(code: number): number {
    const bases = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
    return bases[code] || 0;
  }

  private getDistanceExtraBits(code: number): number {
    const bits = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
    return bits[code] || 0;
  }

  private readUInt16LE(offset: number): number {
    return this.buffer[offset] | (this.buffer[offset + 1] << 8);
  }

  private readUInt32LE(offset: number): number {
    return this.buffer[offset] |
      (this.buffer[offset + 1] << 8) |
      (this.buffer[offset + 2] << 16) |
      (this.buffer[offset + 3] << 24);
  }

  private decodeString(offset: number, length: number): string {
    const chars: string[] = [];
    for (let i = 0; i < length; i++) {
      chars.push(String.fromCharCode(this.buffer[offset + i]));
    }
    return chars.join('');
  }
}
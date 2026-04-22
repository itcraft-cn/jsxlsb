import pako from 'pako';

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

    const view = new DataView(this.buffer.buffer, this.buffer.byteOffset);
    const centralDirOffset = view.getUint32(pos + 16, true);
    const entryCount = view.getUint16(pos + 8, true);

    let entryPos = centralDirOffset;
    for (let i = 0; i < entryCount; i++) {
      if (this.buffer[entryPos] !== 0x50 ||
          this.buffer[entryPos + 1] !== 0x4B ||
          this.buffer[entryPos + 2] !== 0x01 ||
          this.buffer[entryPos + 3] !== 0x02) {
        throw new Error('Invalid central directory entry at ' + entryPos);
      }

      const compressedSize = view.getUint32(entryPos + 20, true);
      const uncompressedSize = view.getUint32(entryPos + 24, true);
      const nameLength = view.getUint16(entryPos + 28, true);
      const extraLength = view.getUint16(entryPos + 30, true);
      const commentLength = view.getUint16(entryPos + 32, true);
      const localHeaderOffset = view.getUint32(entryPos + 42, true);

      const nameStart = entryPos + 46;
      const name = this.decodeString(nameStart, nameLength);

      const compressionMethod = view.getUint16(localHeaderOffset + 8, true);

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

    const view = new DataView(this.buffer.buffer, this.buffer.byteOffset);
    const localHeaderPos = entry.offset;
    
    if (this.buffer[localHeaderPos] !== 0x50 ||
        this.buffer[localHeaderPos + 1] !== 0x4B ||
        this.buffer[localHeaderPos + 2] !== 0x03 ||
        this.buffer[localHeaderPos + 3] !== 0x04) {
      throw new Error('Invalid local file header at ' + localHeaderPos);
    }

    const generalFlag = view.getUint16(localHeaderPos + 6, true);
    const nameLength = view.getUint16(localHeaderPos + 26, true);
    const extraLength = view.getUint16(localHeaderPos + 28, true);

    const dataStart = localHeaderPos + 30 + nameLength + extraLength;

    let compressedSize = entry.compressedSize;
    let uncompressedSize = entry.uncompressedSize;

    if ((generalFlag & 0x08) !== 0) {
      compressedSize = entry.compressedSize;
      uncompressedSize = entry.uncompressedSize;
    }

    const compressedData = this.buffer.slice(dataStart, dataStart + compressedSize);

    if (entry.compressionMethod === 0) {
      return compressedData;
    }

    if (entry.compressionMethod === 8) {
      try {
        return pako.inflateRaw(compressedData);
      } catch (e) {
        throw new Error('Decompression failed for ' + name + ': ' + e);
      }
    }

    throw new Error('Unsupported compression method: ' + entry.compressionMethod);
  }

  getAllEntryNames(): string[] {
    return this.entries.map(e => e.name);
  }

  private decodeString(offset: number, length: number): string {
    const bytes = this.buffer.slice(offset, offset + length);
    return new TextDecoder().decode(bytes);
  }
}
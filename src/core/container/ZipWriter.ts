export interface ZipEntryData {
  name: string;
  data: Uint8Array;
}

export class ZipWriter {
  private entries: ZipEntryData[] = [];

  addEntry(name: string, data: Uint8Array): void {
    this.entries.push({ name, data });
  }

  async toBlob(): Promise<Blob> {
    const result = this.toUint8Array();
    return new Blob([result.buffer as ArrayBuffer], { type: 'application/zip' });
  }

  toUint8Array(): Uint8Array {
    const result: number[] = [];
    let offset = 0;
    const centralHeaders: number[][] = [];

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

  private compress(data: Uint8Array): Uint8Array {
    if (typeof require !== 'undefined') {
      try {
        const zlib = require('zlib');
        const compressed = zlib.deflateRawSync(Buffer.from(data));
        return new Uint8Array(compressed);
      } catch (e) {
      }
    }
    return data;
  }

  private createLocalFileHeaderArray(name: string, compressedSize: number, uncompressedSize: number, offset: number): number[] {
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

  private createCentralDirectoryHeaderArray(name: string, compressedSize: number, uncompressedSize: number, offset: number): number[] {
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

  private createEndOfCentralDirectoryArray(entryCount: number, centralDirSize: number, offset: number): number[] {
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

  private writeUInt16LE(value: number): number[] {
    return [value & 0xFF, (value >> 8) & 0xFF];
  }

  private writeUInt32LE(value: number): number[] {
    return [
      value & 0xFF,
      (value >> 8) & 0xFF,
      (value >> 16) & 0xFF,
      (value >> 24) & 0xFF
    ];
  }

  private encodeString(str: string): number[] {
    const result: number[] = [];
    for (let i = 0; i < str.length; i++) {
      result.push(str.charCodeAt(i) & 0xFF);
    }
    return result;
  }

  clear(): void {
    this.entries = [];
  }

  getEntryCount(): number {
    return this.entries.length;
  }
}
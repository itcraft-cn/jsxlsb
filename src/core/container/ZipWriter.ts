import pako from 'pako';

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
    const chunks: Uint8Array[] = [];
    const centralHeaders: Uint8Array[] = [];
    let offset = 0;

    for (const entry of this.entries) {
      const compressed = pako.deflateRaw(entry.data);
      const crc32 = this.calculateCRC32(entry.data);

      const localHeader = this.createLocalFileHeader(entry.name);
      chunks.push(localHeader);
      chunks.push(compressed);

      const dataDescriptor = this.createDataDescriptor(crc32, compressed.length, entry.data.length);
      chunks.push(dataDescriptor);

      const centralHeader = this.createCentralDirectoryHeader(
        entry.name, crc32, compressed.length, entry.data.length, offset
      );
      centralHeaders.push(centralHeader);

      offset += localHeader.length + compressed.length + dataDescriptor.length;
    }

    for (const header of centralHeaders) {
      chunks.push(header);
    }

    const centralDirSize = centralHeaders.reduce((sum, h) => sum + h.length, 0);
    const endRecord = this.createEndOfCentralDirectory(this.entries.length, centralDirSize, offset);
    chunks.push(endRecord);

    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(totalLength);
    let pos = 0;
    for (const chunk of chunks) {
      result.set(chunk, pos);
      pos += chunk.length;
    }

    return result;
  }

  private createLocalFileHeader(name: string): Uint8Array {
    const nameBytes = new TextEncoder().encode(name);
    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0808, true);
    view.setUint16(8, 8, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint32(14, 0, true);
    view.setUint32(18, 0, true);
    view.setUint32(22, 0, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);

    header.set(nameBytes, 30);

    return header;
  }

  private createDataDescriptor(crc32: number, compressedSize: number, uncompressedSize: number): Uint8Array {
    const descriptor = new Uint8Array(16);
    const view = new DataView(descriptor.buffer);

    view.setUint32(0, 0x08074b50, true);
    view.setUint32(4, crc32, true);
    view.setUint32(8, compressedSize, true);
    view.setUint32(12, uncompressedSize, true);

    return descriptor;
  }

  private createCentralDirectoryHeader(
    name: string, crc32: number, compressedSize: number, uncompressedSize: number, offset: number
  ): Uint8Array {
    const nameBytes = new TextEncoder().encode(name);
    const header = new Uint8Array(46 + nameBytes.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0x0808, true);
    view.setUint16(10, 8, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, 0, true);
    view.setUint32(16, crc32, true);
    view.setUint32(20, compressedSize, true);
    view.setUint32(24, uncompressedSize, true);
    view.setUint16(28, nameBytes.length, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, offset, true);

    header.set(nameBytes, 46);

    return header;
  }

  private createEndOfCentralDirectory(entryCount: number, centralDirSize: number, offset: number): Uint8Array {
    const record = new Uint8Array(22);
    const view = new DataView(record.buffer);

    view.setUint32(0, 0x06054b50, true);
    view.setUint16(4, 0, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, entryCount, true);
    view.setUint16(10, entryCount, true);
    view.setUint32(12, centralDirSize, true);
    view.setUint32(16, offset, true);
    view.setUint16(20, 0, true);

    return record;
  }

  private calculateCRC32(data: Uint8Array): number {
    let crc = 0xFFFFFFFF;
    const table = this.getCRC32Table();

    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xFF];
    }

    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  private getCRC32Table(): number[] {
    const table: number[] = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    return table;
  }

  clear(): void {
    this.entries = [];
  }

  getEntryCount(): number {
    return this.entries.length;
  }
}
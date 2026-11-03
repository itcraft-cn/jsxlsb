export function writeVarInt(value: number): number[] {
  if (value < 128) {
    return [value & 0x7F];
  }
  return [(value & 0x7F) | 0x80, (value >> 7) & 0x7F];
}

export function writeVarSize(value: number): number[] {
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

export function readVarInt(buffer: Uint8Array, offset: number): number {
  const b0 = buffer[offset];
  if ((b0 & 0x80) === 0) {
    return b0;
  }
  const b1 = buffer[offset + 1] & 0x7F;
  return (b0 & 0x7F) | (b1 << 7);
}

export function readVarSize(buffer: Uint8Array, offset: number): number {
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

export function varIntSize(value: number): number {
  return value >= 128 ? 2 : 1;
}

export function varSizeSize(value: number): number {
  if (value < 128) return 1;
  if (value < 16384) return 2;
  if (value < 2097152) return 3;
  return 4;
}

export function writeIntLE(value: number): number[] {
  return [
    value & 0xFF,
    (value >> 8) & 0xFF,
    (value >> 16) & 0xFF,
    (value >> 24) & 0xFF
  ];
}

export function readIntLE(buffer: Uint8Array, offset: number): number {
  return (buffer[offset]) |
    (buffer[offset + 1] << 8) |
    (buffer[offset + 2] << 16) |
    (buffer[offset + 3] << 24);
}

export function writeLongLE(value: number): number[] {
  const low = value & 0xFFFFFFFF;
  const high = Math.floor(value / 0x100000000) & 0xFFFFFFFF;
  return [...writeIntLE(low), ...writeIntLE(high)];
}

export function readLongLE(buffer: Uint8Array, offset: number): number {
  const low = readIntLE(buffer, offset);
  const high = readIntLE(buffer, offset + 4);
  return low + high * 0x100000000;
}

export function writeDoubleLE(value: number): number[] {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, value, true);
  return Array.from(new Uint8Array(buffer));
}

export function readDoubleLE(buffer: Uint8Array, offset: number): number {
  const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 8);
  return view.getFloat64(0, true);
}

export function encodeUTF16LE(str: string): number[] {
  const result: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    result.push(code & 0xFF, (code >> 8) & 0xFF);
  }
  return result;
}

export function decodeUTF16LE(buffer: Uint8Array, offset: number, charCount: number): string {
  // 一次边界检查，再按块批量构造字符串，避免逐码元调用 String.fromCharCode。
  const available = Math.max(0, Math.floor((buffer.length - offset) / 2));
  const count = Math.min(charCount, available);
  if (count <= 0) return '';

  const CHUNK = 4096;
  const parts: string[] = [];
  const units = new Array<number>(Math.min(count, CHUNK));

  for (let start = 0; start < count; start += CHUNK) {
    const end = Math.min(start + CHUNK, count);
    const len = end - start;
    for (let i = 0; i < len; i++) {
      const p = offset + (start + i) * 2;
      units[i] = buffer[p] | (buffer[p + 1] << 8);
    }
    parts.push(String.fromCharCode.apply(null, units.slice(0, len)));
  }
  return parts.join('');
}

export function writeXLWideString(str: string): number[] {
  if (!str || str.length === 0) {
    return [0, 0, 0, 0];
  }
  const utf16le = encodeUTF16LE(str);
  const lengthBytes = writeIntLE(str.length);
  return [...lengthBytes, ...utf16le];
}
export const isNode = typeof process !== 'undefined' 
  && process.versions != null 
  && process.versions.node != null;

export const isBrowser = typeof window !== 'undefined' 
  && typeof document !== 'undefined';

export const hasCompressionStream = typeof CompressionStream !== 'undefined';

export const hasDecompressionStream = typeof DecompressionStream !== 'undefined';

export function getEnvInfo(): string {
  if (isNode) return 'node';
  if (isBrowser) return 'browser';
  return 'unknown';
}
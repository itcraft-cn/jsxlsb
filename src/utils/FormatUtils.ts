import { excelDateToTimestamp } from './DateUtils';

const DATE_FORMAT_CHARS = ['y', 'm', 'd', 'h', 's', 'a', 'p', 'A', 'P', 'M', 'D', 'Y', 'H', 'S'];

export function isDateFormat(formatCode: string): boolean {
  if (!formatCode) return false;
  const lower = formatCode.toLowerCase();
  return DATE_FORMAT_CHARS.some(c => lower.includes(c.toLowerCase())) && 
         !lower.includes('0') && 
         !lower.includes('#') &&
         !lower.includes('%');
}

export function formatCell(value: number, formatCode?: string): { text: string; color?: string } {
  if (!formatCode || formatCode === 'General') {
    return { text: String(value) };
  }

  if (isDateFormat(formatCode)) {
    return formatExcelDate(value, formatCode);
  }

  if (formatCode.endsWith('%')) {
    const percentValue = value * 100;
    const decimals = getDecimals(formatCode);
    return { text: percentValue.toFixed(decimals) + '%' };
  }

  if (formatCode.includes('[Red]') && value < 0) {
    const positiveFormat = formatCode.split(';')[0].replace('[Red]', '');
    const absValue = Math.abs(value);
    const formatted = formatNumber(absValue, positiveFormat);
    return { text: '-' + formatted, color: 'red' };
  }

  if (formatCode.includes('#,##0') || formatCode.includes('#,#')) {
    const formatted = formatNumber(value, formatCode);
    return { text: formatted };
  }

  if (formatCode.match(/^[0]+\.?[0]*$/)) {
    const decimals = getDecimals(formatCode);
    return { text: value.toFixed(decimals) };
  }

  if (formatCode.includes('E+')) {
    return { text: value.toExponential(2) };
  }

  return { text: String(value) };
}

function formatNumber(value: number, formatCode: string): string {
  const decimals = getDecimals(formatCode);
  
  if (formatCode.startsWith('￥') || formatCode.startsWith('$') || formatCode.startsWith('¥')) {
    const symbol = formatCode.charAt(0);
    return symbol + value.toLocaleString('zh-CN', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  }
  
  return value.toLocaleString('zh-CN', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
}

function formatExcelDate(excelDate: number, formatCode: string): { text: string } {
  const timestamp = excelDateToTimestamp(excelDate);
  const date = new Date(timestamp);
  
  const result = formatCode
    .replace(/yyyy/gi, String(date.getFullYear()))
    .replace(/yy/gi, String(date.getFullYear()).slice(-2))
    .replace(/mmmm/gi, getMonthName(date.getMonth()))
    .replace(/mmm/gi, getShortMonthName(date.getMonth()))
    .replace(/mm/gi, pad2(date.getMonth() + 1))
    .replace(/m/gi, String(date.getMonth() + 1))
    .replace(/dd/gi, pad2(date.getDate()))
    .replace(/d/gi, String(date.getDate()))
    .replace(/hh/gi, pad2(date.getHours()))
    .replace(/h/gi, String(date.getHours()))
    .replace(/ss/gi, pad2(date.getSeconds()))
    .replace(/s/gi, String(date.getSeconds()))
    .replace(/AM\/PM/gi, date.getHours() >= 12 ? 'PM' : 'AM')
    .replace(/am\/pm/gi, date.getHours() >= 12 ? 'pm' : 'am');
  
  return { text: result };
}

function getDecimals(formatCode: string): number {
  const match = formatCode.match(/\.([0]+)/);
  if (match) {
    return match[1].length;
  }
  if (formatCode.includes('.') && !formatCode.includes('%')) {
    return 2;
  }
  return 0;
}

function getMonthName(month: number): string {
  const names = ['January', 'February', 'March', 'April', 'May', 'June',
                 'July', 'August', 'September', 'October', 'November', 'December'];
  return names[month];
}

function getShortMonthName(month: number): string {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return names[month];
}

function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}
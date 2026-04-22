const EXCEL_EPOCH_MILLIS = -2208988800000;

export function timestampToExcelDate(timestamp: number): number {
  const days = (timestamp - EXCEL_EPOCH_MILLIS) / (24 * 60 * 60 * 1000);
  return days + 1.0;
}

export function excelDateToTimestamp(excelDate: number): number {
  const days = excelDate - 1.0;
  return Math.round(days * 24 * 60 * 60 * 1000 + EXCEL_EPOCH_MILLIS);
}
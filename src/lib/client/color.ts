/** 依底色亮度選擇黑字或白字，確保座位號碼清楚可讀 */
export function textOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#141414' : '#ffffff';
}

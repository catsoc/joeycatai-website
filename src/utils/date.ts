/**
 * 格式化日期為人類可讀字串（zh-TW locale）
 * 例：2026年2月18日
 */
export function formatDate(date: Date, locale: Intl.LocalesArgument = 'zh-TW'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * 回傳 ISO 8601 字串，供 <time datetime="..."> 或 JSON-LD 使用
 */
export function isoDate(date: Date): string {
  return date.toISOString();
}

/**
 * 估算閱讀時間（分鐘），以中文 300字/分鐘、英文 200詞/分鐘混合計算
 */
export function getReadingTime(text: string): number {
  const cjkChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g) ?? []).length;
  const words = (text.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, '').match(/\S+/g) ?? []).length;
  const minutes = cjkChars / 300 + words / 200;
  return Math.max(1, Math.round(minutes));
}

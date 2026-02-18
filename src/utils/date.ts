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

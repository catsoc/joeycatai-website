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
 * 輸入為 Astro post.body（原始 MDX），先剝除非散文內容再計算
 */
export function getReadingTime(text: string): number {
  const stripped = text
    .replace(/^---[\s\S]*?---/, '')            // frontmatter
    .replace(/```[\s\S]*?```/g, '')            // 圍欄式程式碼區塊
    .replace(/`[^`\n]+`/g, '')                 // 行內程式碼
    .replace(/^\s*(?:import|export)\s+.+$/gm, '') // MDX import/export 陳述句
    .replace(/<[^>]+>/g, '')                   // JSX / HTML 標籤
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')  // Markdown 連結 → 只保留文字
    .replace(/[#*_~|>]/g, '');                 // Markdown 格式字元

  const cjkChars = (stripped.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g) ?? []).length;
  const words = (stripped.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, '').match(/\S+/g) ?? []).length;
  const minutes = cjkChars / 300 + words / 200;
  return Math.max(1, Math.round(minutes));
}

/** 將 tag 轉為 URL-safe slug：小寫、空白轉 -、去除不安全字元 */
export function toTagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fff\u3400-\u4dbf-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export type TagInfo = { display: string; count: number };

/** 從內容條目建立 tag 映射表 (key = slug, value = display name + count) */
export function buildTagMap(
  entries: Array<{ data: { tags: string[] } }>,
): Map<string, TagInfo> {
  const map = new Map<string, TagInfo>();
  for (const entry of entries) {
    for (const tag of entry.data.tags) {
      const slug = toTagSlug(tag);
      const existing = map.get(slug);
      if (existing) {
        existing.count++;
      } else {
        map.set(slug, { display: tag, count: 1 });
      }
    }
  }
  return map;
}

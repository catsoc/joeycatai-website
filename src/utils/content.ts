import { getCollection } from 'astro:content';

/**
 * 取得所有已發布文章，依發布日期由新到舊排序
 */
export async function getSortedPosts() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

/**
 * 取得所有專案，精選（featured）優先，同狀態再依日期由新到舊
 */
export async function getSortedProjects() {
  const projects = await getCollection('projects');
  return projects.sort((a, b) => {
    if (a.data.featured !== b.data.featured) return a.data.featured ? -1 : 1;
    return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
  });
}

/**
 * 回傳所有 tag 及其出現次數（合併 blog + projects）
 * Map key 統一小寫，避免 "TypeScript" 與 "typescript" 產生重複路由
 */
export async function getAllTags(): Promise<Map<string, number>> {
  const [posts, projects] = await Promise.all([
    getCollection('blog', ({ data }) => !data.draft),
    getCollection('projects'),
  ]);

  const tagCount = new Map<string, number>();
  for (const item of [...posts, ...projects]) {
    for (const tag of item.data.tags) {
      const key = tag.toLowerCase();
      tagCount.set(key, (tagCount.get(key) ?? 0) + 1);
    }
  }
  return tagCount;
}

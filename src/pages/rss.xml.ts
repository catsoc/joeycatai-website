import rss from '@astrojs/rss';
import { getPublishedPosts } from '@/lib/content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getPublishedPosts();
  return rss({
    title: 'joeycatai · 文章',
    description: '技術筆記、開發心得與隨筆紀錄',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.id}`,
    })),
    customData: '<language>zh-TW</language>',
  });
}

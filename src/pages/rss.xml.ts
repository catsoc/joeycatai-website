import rss from '@astrojs/rss';
import { getPublishedPosts } from '@/lib/content';
import { SITE } from '@/site.config';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getPublishedPosts();
  return rss({
    title: `${SITE.name} · 文章`,
    description: SITE.description,
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

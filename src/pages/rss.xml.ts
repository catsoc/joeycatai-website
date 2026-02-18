import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getSortedPosts } from '@/utils/content';
import { SITE } from '@/site.config';

export async function GET(context: APIContext) {
  const posts = await getSortedPosts();
  return rss({
    title: `${SITE.name} · 文章`,
    description: SITE.description,
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.slug}/`,
    })),
    customData: '<language>zh-TW</language>',
  });
}

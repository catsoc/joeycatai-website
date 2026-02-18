import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { generateOgImageSafe } from '@/lib/og';
import { SITE } from '@/site.config';

interface OgProps {
  title: string;
  description: string;
  tags: string[];
}

export async function getStaticPaths() {
  const [posts, projects] = await Promise.all([
    getCollection('blog', ({ data }) => !data.draft),
    getCollection('projects'),
  ]);

  const allTags = [
    ...new Set([
      ...posts.flatMap((p) => p.data.tags.map((t) => t.toLowerCase())),
      ...projects.flatMap((p) => p.data.tags.map((t) => t.toLowerCase())),
    ]),
  ];

  const staticRoutes: Array<{ route: string } & OgProps> = [
    { route: 'default', title: SITE.name, description: SITE.description, tags: [] },
    { route: 'blog', title: '文章', description: '技術筆記、開發心得與隨筆紀錄', tags: [] },
    { route: 'projects', title: '專案', description: '開源專案與個人作品集', tags: [] },
    { route: 'about', title: '關於我', description: SITE.description, tags: [] },
    { route: 'contact', title: '聯絡我', description: '歡迎透過各種管道與我聯繫', tags: [] },
    { route: 'tags', title: '標籤', description: '依標籤瀏覽所有文章與專案', tags: [] },
  ];

  return [
    // 靜態頁面
    ...staticRoutes.map(({ route, ...props }) => ({ params: { route }, props })),
    // 標籤頁
    ...allTags.map((tag) => ({
      params: { route: `tags/${tag}` },
      props: { title: `#${tag}`, description: `所有標記為 ${tag} 的文章與專案`, tags: [tag] },
    })),
    // 文章頁
    ...posts.map((post) => ({
      params: { route: `blog/${post.slug}` },
      props: {
        title: post.data.title,
        description: post.data.description,
        tags: post.data.tags,
      },
    })),
    // 專案頁
    ...projects.map((project) => ({
      params: { route: `projects/${project.slug}` },
      props: {
        title: project.data.title,
        description: project.data.description,
        tags: project.data.tags,
      },
    })),
  ];
}

export async function GET({ props }: APIContext) {
  const { title, description, tags } = props as OgProps;
  const png = await generateOgImageSafe({ title, description, tags });
  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

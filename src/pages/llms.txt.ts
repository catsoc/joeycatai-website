import { getPublishedPosts, getProjects } from '@/lib/content';
import { SITE } from '@/site.config';

export async function GET() {
  const [posts, projects] = await Promise.all([getPublishedPosts(), getProjects()]);

  const lines: string[] = [
    `# ${SITE.name}`,
    '',
    SITE.description,
    '',
    '## Blog',
    '',
    ...posts.map((p) => `- [${p.data.title}](${SITE.url}/blog/${p.id}): ${p.data.description}`),
    '',
    '## Projects',
    '',
    ...projects.map((p) => `- [${p.data.title}](${SITE.url}/projects/${p.id}) [${p.data.status}]: ${p.data.description}`),
  ];

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

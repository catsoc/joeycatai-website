import { getCollection, type CollectionEntry } from 'astro:content';
import { toTagSlug, buildTagMap } from './tags';

type BlogEntry = CollectionEntry<'blog'>;
type ProjectEntry = CollectionEntry<'projects'>;
type DatedEntry = { data: { pubDate: Date } };
type TaggedEntry = { data: { tags: string[] } };

const sortByPubDateDesc = <T extends DatedEntry>(items: T[]) =>
  [...items].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

const hasTag = (item: TaggedEntry, targetSlug: string) =>
  item.data.tags.some((tag) => toTagSlug(tag) === targetSlug);

export const getPublishedPosts = async (): Promise<BlogEntry[]> =>
  sortByPubDateDesc(await getCollection('blog', ({ data }) => !data.draft));

export const getProjects = async (): Promise<ProjectEntry[]> =>
  sortByPubDateDesc(await getCollection('projects'));

export async function getProjectsSorted(): Promise<ProjectEntry[]> {
  const projects = await getCollection('projects');
  return [...projects].sort((a, b) => {
    if (a.data.featured !== b.data.featured) return a.data.featured ? -1 : 1;
    return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
  });
}

export async function getRecentPosts(limit?: number): Promise<BlogEntry[]> {
  const posts = await getPublishedPosts();
  return limit === undefined ? posts : posts.slice(0, limit);
}

export async function getFeaturedProjects(limit?: number): Promise<ProjectEntry[]> {
  const featuredProjects = (await getProjects()).filter((project) => project.data.featured);
  return limit === undefined ? featuredProjects : featuredProjects.slice(0, limit);
}

export async function getTagIndex(): Promise<Array<{ slug: string; display: string; count: number }>> {
  const [posts, projects] = await Promise.all([getPublishedPosts(), getProjects()]);
  const tagMap = buildTagMap([...posts, ...projects]);
  return [...tagMap.entries()]
    .map(([slug, info]) => ({ slug, display: info.display, count: info.count }))
    .sort((a, b) => b.count - a.count);
}

export async function getItemsByTag(
  slug: string,
): Promise<{ posts: BlogEntry[]; projects: ProjectEntry[] }> {
  const [posts, projects] = await Promise.all([getPublishedPosts(), getProjects()]);
  return {
    posts: posts.filter((post) => hasTag(post, slug)),
    projects: projects.filter((project) => hasTag(project, slug)),
  };
}

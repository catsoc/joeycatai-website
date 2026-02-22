import { getCollection, type CollectionEntry } from 'astro:content';

type BlogEntry = CollectionEntry<'blog'>;
type ProjectEntry = CollectionEntry<'projects'>;
type DatedEntry = { data: { pubDate: Date } };
type TaggedEntry = { data: { tags: string[] } };

const sortByPubDateDesc = <T extends DatedEntry>(items: T[]) =>
  [...items].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

const hasTag = (item: TaggedEntry, tag: string) =>
  item.data.tags.some((itemTag) => itemTag.toLowerCase() === tag);

export const getPublishedPosts = async (): Promise<BlogEntry[]> =>
  sortByPubDateDesc(await getCollection('blog', ({ data }) => !data.draft));

export const getProjects = async (): Promise<ProjectEntry[]> =>
  sortByPubDateDesc(await getCollection('projects'));

export async function getRecentPosts(limit?: number): Promise<BlogEntry[]> {
  const posts = await getPublishedPosts();
  return limit === undefined ? posts : posts.slice(0, limit);
}

export async function getFeaturedProjects(limit?: number): Promise<ProjectEntry[]> {
  const featuredProjects = (await getProjects()).filter((project) => project.data.featured);
  return limit === undefined ? featuredProjects : featuredProjects.slice(0, limit);
}

async function getTagBuckets(): Promise<Record<string, number>> {
  const [posts, projects] = await Promise.all([getPublishedPosts(), getProjects()]);
  const buckets: Record<string, number> = {};

  for (const entry of [...posts, ...projects]) {
    for (const tag of entry.data.tags) {
      const key = tag.toLowerCase();
      buckets[key] = (buckets[key] ?? 0) + 1;
    }
  }

  return buckets;
}

export async function getTagIndex(): Promise<Array<[string, number]>> {
  const buckets = await getTagBuckets();
  return Object.entries(buckets).sort((a, b) => b[1] - a[1]);
}

export async function getItemsByTag(
  tag: string
): Promise<{ posts: BlogEntry[]; projects: ProjectEntry[] }> {
  const targetTag = tag.toLowerCase();
  const [posts, projects] = await Promise.all([getPublishedPosts(), getProjects()]);

  return {
    posts: posts.filter((post) => hasTag(post, targetTag)),
    projects: projects.filter((project) => hasTag(project, targetTag)),
  };
}

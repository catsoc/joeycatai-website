import { z, defineCollection } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().min(1).max(100),
    description: z.string().min(1).max(300),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    tags: z.array(z.string().min(1)).default([]),
    draft: z.boolean().default(false),
    lang: z.enum(['zh-TW', 'en']).default('zh-TW'),
  }),
});

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().min(1).max(100),
    description: z.string().min(1).max(300),
    pubDate: z.coerce.date(),
    heroImage: z.string().optional(),
    tags: z.array(z.string().min(1)).default([]),
    github: z.string().url().optional(),
    demo: z.string().url().optional(),
    featured: z.boolean().default(false),
    status: z.enum(['active', 'completed', 'archived']).default('completed'),
  }),
});

export const collections = { blog, projects };

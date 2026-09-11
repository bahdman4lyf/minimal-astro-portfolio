import { defineCollection, z } from "astro:content";
import { glob, file } from "astro/loaders";

const blog = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/blog",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    draft: z.boolean().optional().default(false),
  }),
});

const experience = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/experience",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    current: z.boolean().optional().default(false),
  }),
});

const projects = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/projects",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    url: z.string().url(),
    featured: z.boolean().optional().default(false),
    techs: z.array(z.string()).optional(),
  }),
});

const linkedSection = z.object({
  title: z.string(),
  viewAllText: z.string(),
});

const plainSection = z.object({
  title: z.string(),
});

const site = defineCollection({
  loader: file("./src/content/site/config.json"),
  schema: z.object({
    name: z.string(),
    /** Formal name for search, social cards, and structured data. */
    seoName: z.string().optional(),
    title: z.string(),
    introduction: z.string(),
    /** Hero headline. Wrap one phrase in *asterisks* to render it as the italic accent. */
    headline: z.string().optional(),
    availability: z.string().optional(),
    /** Extra hero figures. "Years shipping" is derived from experience and always shown first. */
    stats: z
      .array(
        z.object({
          value: z.number(),
          suffix: z.string().optional(),
          label: z.string(),
        }),
      )
      .optional(),
    services: z
      .array(
        z.object({
          title: z.string(),
          description: z.string(),
          tags: z.array(z.string()).optional(),
        }),
      )
      .optional(),
    principles: z
      .array(
        z.object({
          title: z.string(),
          description: z.string(),
        }),
      )
      .optional(),
    sections: z.object({
      blog: linkedSection,
      projects: linkedSection,
      experience: linkedSection,
      services: plainSection.optional(),
      principles: plainSection.optional(),
      skills: plainSection.optional(),
      faq: plainSection.optional(),
      contact: plainSection.extend({ description: z.string() }).optional(),
    }),
    skills: z
      .array(
        z.object({
          category: z.string(),
          items: z.array(z.string()),
        }),
      )
      .optional(),
    faq: z
      .array(
        z.object({
          q: z.string(),
          a: z.string(),
        }),
      )
      .optional(),
    contact: z
      .object({
        email: z.string().email(),
        location: z.string().optional(),
        /** IANA zone, e.g. "Africa/Lagos" — drives the live local clock in the hero. */
        timezone: z.string().optional(),
      })
      .optional(),
    socialLinks: z
      .array(
        z.object({
          platform: z.string(),
          url: z.string().url(),
        }),
      )
      .optional(),
  }),
});

const notes = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/notes",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    category: z.string(),
    draft: z.boolean().optional().default(false),
  }),
});

const bookmarks = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/bookmarks",
  }),
  schema: z.object({
    title: z.string(),
    type: z.enum(["article", "book", "video"]),
    author: z.string(),
    url: z.string().url(),
    publishedAt: z.coerce.date(),
    createdAt: z.coerce.date(),
    description: z.string().optional(),
  }),
});

export const collections = {
  blog,
  experience,
  projects,
  site,
  notes,
  bookmarks,
};

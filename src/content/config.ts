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
    title: z.string(),
    introduction: z.string(),
    sections: z.object({
      blog: linkedSection,
      projects: linkedSection,
      experience: linkedSection,
      skills: plainSection.optional(),
      education: plainSection.optional(),
      certifications: plainSection.optional(),
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
    education: z
      .array(
        z.object({
          school: z.string(),
          credential: z.string(),
          location: z.string().optional(),
          startDate: z.coerce.date(),
          endDate: z.coerce.date().optional(),
          current: z.boolean().optional().default(false),
        }),
      )
      .optional(),
    certifications: z
      .array(
        z.object({
          name: z.string(),
          year: z.string(),
          url: z.string().url().optional(),
        }),
      )
      .optional(),
    contact: z
      .object({
        email: z.string().email(),
        location: z.string().optional(),
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

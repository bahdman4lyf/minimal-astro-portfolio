import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const prerender = true;

const site = "https://bahdman.splash.ng";

const xmlEscape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&apos;");

export const GET: APIRoute = async () => {
  const [posts, notes, bookmarks] = await Promise.all([
    getCollection("blog", ({ data }) => !data.draft),
    getCollection("notes", ({ data }) => !data.draft),
    getCollection("bookmarks"),
  ]);
  const staticPages = ["/", "/blog", "/notes", "/bookmarks"];
  const categoryPages = [...new Set(notes.map((note) => `/notes/${note.data.category}`))];
  const bookmarkTypePages = [...new Set(bookmarks.map((bookmark) => `/bookmarks/${bookmark.data.type}`))];
  const datedPages = [
    ...posts.map((post) => ({ path: `/blog/${post.id}`, lastmod: post.data.publishedAt })),
    ...notes.map((note) => ({ path: `/notes/${note.id}`, lastmod: note.data.publishedAt })),
  ];
  const entries = [...staticPages.map((path) => ({ path })), ...categoryPages.map((path) => ({ path })), ...bookmarkTypePages.map((path) => ({ path })), ...datedPages];
  const body = entries.map(({ path, lastmod }) => `  <url><loc>${xmlEscape(new URL(path, site).href)}</loc>${lastmod ? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : ""}</url>`).join("\n");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};

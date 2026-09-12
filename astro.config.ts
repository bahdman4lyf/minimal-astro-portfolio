import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";

export default defineConfig({
  // Drives canonical URLs, og:url, and the absolute og:image. Without it the
  // build bakes a localhost origin into every page's metadata.
  site: "https://bahdman.splash.ng",
  // Every page is prerendered. The adapter exists only for the routes that opt
  // out with `prerender = false` (the Spotify endpoint), which run as a Vercel
  // function at request time so secrets never reach the browser.
  output: "static",
  adapter: vercel(),
  prefetch: true,
  compressHTML: true,
  vite: {
    server: {
      // Build output is huge; watching it makes the dev server lag behind edits.
      watch: { ignored: ["**/.vercel/**", "**/dist/**"] },
    },
  },
});

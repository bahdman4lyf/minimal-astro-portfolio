import { defineConfig } from 'astro/config';

export default defineConfig({
  // Drives canonical URLs, og:url, and the absolute og:image. Without it the
  // build bakes a localhost origin into every page's metadata.
  site: "https://blank.splash.ng",
  output: "static",
  prefetch: true,
  compressHTML: true,
});
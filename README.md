# Free Minimal Astro Portfolio

A modern, minimalist portfolio website built with Astro and deployed on Vercel behind Cloudflare. Features a collection of writings, projects, and professional experiences.

![alt text](image.png)

## Overview

This is a personal portfolio website for Nathan, a Software Engineer and Curious Tinkerer, live at <https://bahdman.splash.ng>. The site showcases blog posts, technical notes, project work, and professional experience in a clean, fast-loading format.

## Features

- 🚀 Built with [Astro](https://astro.build) v5.1
- ⚡️ Deployed on [Vercel](https://vercel.com/), proxied through Cloudflare
- 📝 Content sections:
  - Blog posts
  - Technical notes
  - Project showcase
  - Professional experience
  - Curated bookmarks
- 🎨 Typography:
  - Syne (display headings)
  - Instrument Serif (italic accents)
  - Inter (body)
  - Roboto Mono (code and labels)
- 🌐 Social presence integration
- 📱 Fully responsive design

## Tech Stack

- **Framework**: [Astro](https://astro.build) 5.1.2
- **Deployment**: Vercel (static output + one serverless route), Cloudflare DNS/proxy in front
- **Fonts**:
  - @fontsource-variable/syne
  - @fontsource/instrument-serif
  - @fontsource/inter
  - @fontsource/roboto-mono

## Spotify "Now playing"

A small dock in the bottom-left corner shows what I'm listening to right now (or the last track played). It's powered by a single on-demand route, [`/api/spotify.json`](src/pages/api/spotify.json.ts), that runs as a Vercel function at request time — the refresh token never reaches the browser. When the secrets aren't set, the endpoint reports `configured: false` and the widget hides itself.

1. Create an app at <https://developer.spotify.com/dashboard>. In its settings add `http://127.0.0.1:8888/callback` as a Redirect URI, and note the Client ID and Client Secret.
2. Run `pnpm spotify:setup`. It asks for those two values, opens Spotify so you can approve read access to your playback, confirms which account it connected to, writes `.env`, and offers to push the three values to Vercel as production environment variables.
3. Restart `pnpm dev`. The dock now shows whatever is playing on your account.

To style the widget without real credentials, set `SPOTIFY_MOCK=1` in `.env` instead.

Visitors can listen along: the dock drives Spotify's official [Embed iFrame API](https://developer.spotify.com/documentation/embeds/references/iframe-api), which streams the full track to visitors signed in to Spotify in their browser (and seeks them to the same point I'm at). Spotify only licenses a 30-second excerpt for anonymous listeners — the dock detects that case, says so, and offers a sign-in link; when the visitor comes back, the player rebuilds itself and switches to the full song. The album art is the play/pause button; the ⤢ button reveals the official Spotify player. Playback tries to start on load and, because browsers block sound until the visitor interacts, otherwise starts on their first click or keypress. Once a visitor pauses, the site stays quiet for the rest of their session.

## Contact form

Messages from the contact form are sent to your inbox with [EmailJS](https://www.emailjs.com) directly from the browser — no server involved.

1. In EmailJS, add an **Email Service** (Gmail works; connect `nathancodes05@gmail.com`) and note the Service ID.
2. Create an **Email Template**. Set *To Email* to your address, *Reply To* to `{{email}}`, and use these variables in the subject/body: `{{title}}` (the topic), `{{name}}`, `{{email}}`, `{{time}}`, `{{message}}` — the default "Contact Us" template already does. Note the Template ID.
3. Copy your **Public Key** from Account → API Keys.
4. Put all three in `.env` as `PUBLIC_EMAILJS_PUBLIC_KEY`, `PUBLIC_EMAILJS_SERVICE_ID`, `PUBLIC_EMAILJS_TEMPLATE_ID`, and add the same three variables on Vercel, then redeploy. Restart `pnpm dev` after editing `.env`.
5. In the EmailJS dashboard, restrict the key to your domain (Account → Security → Allowed origins) so nobody can send through it from elsewhere.

Without the three values the form falls back to opening the visitor's mail app. Submissions include a hidden honeypot field to drop bot spam.

## Keyboard shortcuts

- `⌘K` / `Ctrl+K` or `/` — open search (every post, note, bookmark and page)
- `↑` `↓` `↵` — move through results and open one
- `Esc` — close

## Development

### Prerequisites

- Node.js (Latest LTS version recommended)
- npm or pnpm

### Local Development

1. Clone the repository
2. Run `pnpm install` to install dependencies
3. Run `pnpm dev` to start the development server
4. Open your browser and navigate to `http://localhost:4321` to view the site

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Astro](https://astro.build)
- [Fontsource](https://fontsource.org)
- [Tailwind CSS](https://tailwindcss.com)

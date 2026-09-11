import type { APIRoute } from "astro";
import { getSecret } from "astro:env/server";

// Runs on-demand as a Vercel function; every other page stays static. The
// refresh token never leaves the server — the browser only sees track metadata.
export const prerender = false;

interface SpotifyEnv {
  SPOTIFY_CLIENT_ID?: string;
  SPOTIFY_CLIENT_SECRET?: string;
  SPOTIFY_REFRESH_TOKEN?: string;
  /** "1" serves a fake track so the widget can be styled without real credentials. */
  SPOTIFY_MOCK?: string;
}

export interface NowPlaying {
  configured: boolean;
  isPlaying: boolean;
  title?: string;
  artist?: string;
  album?: string;
  albumArt?: string;
  url?: string;
  /** Spotify id — the Embed player streams from this. */
  trackId?: string;
  /** Podcasts play too; the embed needs to know which kind of URI to load. */
  kind?: "track" | "episode";
  progressMs?: number;
  durationMs?: number;
  /** ISO timestamp of when the last track was played, when nothing is live. */
  playedAt?: string;
}

// Access tokens last an hour; keep one per isolate so most requests skip the
// refresh round-trip entirely.
let cachedToken: { value: string; expiresAt: number } | null = null;

const json = (body: NowPlaying, maxAge = 20) =>
  new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": `public, max-age=${maxAge}, s-maxage=${maxAge}`,
    },
  });

// Secrets come from .env locally and from Vercel environment variables in
// production; getSecret reads both at request time.
const readEnv = (): SpotifyEnv => ({
  SPOTIFY_CLIENT_ID: getSecret("SPOTIFY_CLIENT_ID"),
  SPOTIFY_CLIENT_SECRET: getSecret("SPOTIFY_CLIENT_SECRET"),
  SPOTIFY_REFRESH_TOKEN: getSecret("SPOTIFY_REFRESH_TOKEN"),
  SPOTIFY_MOCK: getSecret("SPOTIFY_MOCK"),
});

const getAccessToken = async (env: Required<SpotifyEnv>) => {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`)}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: env.SPOTIFY_REFRESH_TOKEN }),
  });
  if (!res.ok) throw new Error(`token refresh failed: ${res.status}`);

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
};

interface Image {
  url: string;
  width: number;
}

interface Track {
  type: "track";
  id: string;
  name: string;
  external_urls: { spotify: string };
  duration_ms: number;
  artists: { name: string }[];
  album: { name: string; images: Image[] };
}

interface Episode {
  type: "episode";
  id: string;
  name: string;
  external_urls: { spotify: string };
  duration_ms: number;
  images: Image[];
  show: { name: string; publisher: string };
}

type Item = Track | Episode;

const pickArt = (images: Image[]) =>
  // Smallest image that's still crisp at 2x for a 56px thumbnail.
  [...images].sort((a, b) => a.width - b.width).find((i) => i.width >= 120)?.url ?? images[0]?.url;

const describe = (item: Item) =>
  item.type === "episode"
    ? {
        kind: "episode" as const,
        title: item.name,
        artist: item.show.name,
        album: item.show.publisher,
        albumArt: pickArt(item.images),
        url: item.external_urls.spotify,
        trackId: item.id,
        durationMs: item.duration_ms,
      }
    : {
        kind: "track" as const,
        title: item.name,
        artist: item.artists.map((a) => a.name).join(", "),
        album: item.album.name,
        albumArt: pickArt(item.album.images),
        url: item.external_urls.spotify,
        trackId: item.id,
        durationMs: item.duration_ms,
      };

export const GET: APIRoute = async () => {
  const env = readEnv();
  if (env.SPOTIFY_MOCK === "1") {
    return json(
      {
        configured: true,
        isPlaying: true,
        title: "Redbone",
        artist: "Childish Gambino",
        album: "Awaken, My Love!",
        albumArt: "/images/og-image.png",
        url: "https://open.spotify.com/track/0wXuerDYiBnERgIpbb3JBR",
        trackId: "0wXuerDYiBnERgIpbb3JBR",
        kind: "track",
        progressMs: 64_000,
        durationMs: 326_000,
      },
      0,
    );
  }
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET || !env.SPOTIFY_REFRESH_TOKEN) {
    return json({ configured: false, isPlaying: false }, 300);
  }

  try {
    const token = await getAccessToken(env as Required<SpotifyEnv>);
    const auth = { headers: { authorization: `Bearer ${token}` } };

    // Without additional_types Spotify returns an empty item for podcasts.
    const now = await fetch("https://api.spotify.com/v1/me/player/currently-playing?additional_types=track,episode", auth);
    // 200 with a track means live playback. 204 means nothing is playing.
    if (now.status === 200) {
      const data = (await now.json()) as { is_playing: boolean; progress_ms: number; item: Item | null };
      if (data.item && data.is_playing) {
        return json({ configured: true, isPlaying: true, progressMs: data.progress_ms, ...describe(data.item) }, 10);
      }
    }

    const recent = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=1", auth);
    if (recent.ok) {
      const data = (await recent.json()) as { items: { track: Track; played_at: string }[] };
      const last = data.items[0];
      if (last) return json({ configured: true, isPlaying: false, playedAt: last.played_at, ...describe(last.track) }, 60);
    }

    return json({ configured: true, isPlaying: false }, 60);
  } catch (err) {
    console.error("[spotify]", err);
    return json({ configured: true, isPlaying: false }, 30);
  }
};

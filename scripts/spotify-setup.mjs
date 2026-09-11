#!/usr/bin/env node
// One-time setup for the "now playing" dock. Run with:
//
//   pnpm spotify:setup
//
// It asks for the Client ID + Secret from https://developer.spotify.com/dashboard,
// opens Spotify so you can grant the site read access to your playback, then
// writes the three values to .env (local) and, if you say yes, pushes them
// to Vercel as environment variables (production).
//
// Before running, add this Redirect URI to your Spotify app:
//   http://127.0.0.1:8888/callback

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { exec, spawnSync } from "node:child_process";
import { stdin as input, stdout as output } from "node:process";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const envPath = path.join(root, ".env");
const redirectUri = "http://127.0.0.1:8888/callback";
const scope = "user-read-currently-playing user-read-playback-state user-read-recently-played";

const rl = readline.createInterface({ input, output });
const ask = async (q, fallback) => {
  const a = (await rl.question(fallback ? `${q} [${fallback}]: ` : `${q}: `)).trim();
  return a || fallback || "";
};

// Anything already in .env (from a previous run) becomes the default.
const existing = Object.fromEntries(
  fs.existsSync(envPath)
    ? fs
        .readFileSync(envPath, "utf8")
        .split("\n")
        .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
        .map((l) => {
          const i = l.indexOf("=");
          return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
        })
    : [],
);

console.log("\nSpotify setup — grab the Client ID and Secret from your app at");
console.log("https://developer.spotify.com/dashboard (Settings), and make sure the");
console.log(`Redirect URI  ${redirectUri}  is added there.\n`);

const id = await ask("Client ID", process.env.SPOTIFY_CLIENT_ID || existing.SPOTIFY_CLIENT_ID);
const secret = await ask("Client Secret", process.env.SPOTIFY_CLIENT_SECRET || existing.SPOTIFY_CLIENT_SECRET);
if (!id || !secret) {
  console.error("\nBoth values are required.");
  process.exit(1);
}

const authorizeUrl =
  "https://accounts.spotify.com/authorize?" +
  new URLSearchParams({ client_id: id, response_type: "code", redirect_uri: redirectUri, scope, show_dialog: "true" });

const refreshToken = await new Promise((resolve, reject) => {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, redirectUri);
    if (url.pathname !== "/callback") return res.end();

    const code = url.searchParams.get("code");
    if (!code) {
      res.end("Spotify didn't return a code. Check the terminal.");
      server.close();
      return reject(new Error(`Spotify returned: ${url.searchParams.get("error")}`));
    }

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
    });
    const data = await tokenRes.json();
    server.close();

    if (!data.refresh_token) {
      res.end("Token exchange failed. Check the terminal.");
      return reject(new Error(JSON.stringify(data)));
    }
    res.end("<body style='font:16px system-ui;padding:2rem'>Connected — you can close this tab and go back to the terminal.</body>");
    resolve(data.refresh_token);
  });

  server.listen(8888, "127.0.0.1", () => {
    console.log("\nOpening Spotify so you can approve access. If nothing opens, visit:\n\n" + authorizeUrl + "\n");
    const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    exec(`${opener} "${authorizeUrl}"`);
  });
}).catch((err) => {
  console.error("\n" + err.message);
  process.exit(1);
});

// Sanity check: does the token actually reach the account?
const access = await fetch("https://accounts.spotify.com/api/token", {
  method: "POST",
  headers: {
    authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
    "content-type": "application/x-www-form-urlencoded",
  },
  body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
}).then((r) => r.json());
const me = await fetch("https://api.spotify.com/v1/me", { headers: { authorization: `Bearer ${access.access_token}` } }).then(
  (r) => r.json(),
);
console.log(`\nConnected as ${me.display_name ?? me.id ?? "your Spotify account"}.`);

// Write .env, keeping unrelated keys and dropping the mock flag.
const vars = { ...existing, SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret, SPOTIFY_REFRESH_TOKEN: refreshToken };
delete vars.SPOTIFY_MOCK;
fs.writeFileSync(envPath, Object.entries(vars).map(([k, v]) => `${k}=${v}`).join("\n") + "\n");
console.log(`Wrote ${path.relative(root, envPath)} — restart \`pnpm dev\` to pick it up.`);

// Optionally push to Vercel so production has the same values. Needs the
// project linked once (`npx vercel link`) and a logged-in Vercel CLI.
const push = (await ask("\nPush these to Vercel as production env vars now? (y/N)", "N")).toLowerCase() === "y";
if (push) {
  for (const key of ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET", "SPOTIFY_REFRESH_TOKEN"]) {
    // Remove any existing value first; `env add` refuses to overwrite.
    spawnSync("npx", ["vercel", "env", "rm", key, "production", "--yes"], { stdio: "ignore", cwd: root });
    const r = spawnSync("npx", ["vercel", "env", "add", key, "production"], {
      input: vars[key] + "\n",
      stdio: ["pipe", "inherit", "inherit"],
      cwd: root,
    });
    if (r.status !== 0) {
      console.error(`\nCouldn't set ${key}. Add it by hand: Vercel dashboard → project → Settings → Environment Variables.`);
      break;
    }
  }
  console.log("\nRedeploy on Vercel for the new variables to take effect.");
} else {
  console.log("\nFor production, add the same three values in the Vercel dashboard");
  console.log("(project → Settings → Environment Variables), then redeploy — or re-run this and answer Y.");
}

rl.close();

import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // Cloudflare Pages, with server routes available so holiday feeds can be
    // fetched (Google's ICS sends no CORS headers) and share links can be stored
    // in KV. The adapter also generates _routes.json so static assets are served
    // without invoking the Worker.
    adapter: adapter(),
  },
};

export default config;

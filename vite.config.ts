import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

// Tailwind is listed first, matching the order in Tailwind's official SvelteKit guide.
export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
});

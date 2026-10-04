import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

// Tests cover pure logic: the ICS parser, date helpers, the swap plan model,
// share payload validation, and .ics export. None of them need a DOM, so a
// single node environment is enough. The sveltekit plugin is present so that the
// $lib alias resolves the same way it does in the app.
export default defineConfig({
  plugins: [sveltekit()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});

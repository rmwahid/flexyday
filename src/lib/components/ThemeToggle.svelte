<script lang="ts">
  import { onMount } from "svelte";
  import { Moon, Sun } from "@lucide/svelte";

  const STORAGE_KEY = "flexyday-theme";

  let theme = $state<"light" | "dark">("light");
  let mounted = $state(false);

  onMount(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") {
      theme = stored;
    } else {
      theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    mounted = true;
  });

  function toggle() {
    theme = theme === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }
</script>

<button
  type="button"
  class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-panel text-ink-muted transition-all duration-200 hover:text-ink hover:shadow-sm active:scale-95 focus:outline-2 focus:outline-offset-1 focus:outline-accent"
  onclick={toggle}
  aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
  title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
>
  {#if mounted}
    {#if theme === "dark"}
      <Sun size={16} />
    {:else}
      <Moon size={16} />
    {/if}
  {:else}
    <Moon size={16} />
  {/if}
</button>

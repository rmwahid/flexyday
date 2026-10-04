<script lang="ts">
  import { CalendarRange } from "@lucide/svelte";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";

  interface Props {
    statusText?: string | null;
  }

  let { statusText = null }: Props = $props();
</script>

<header
  class="sticky top-0 z-30 border-b border-line bg-paper/80 backdrop-blur-xl"
>
  <div class="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-5 sm:px-8">
    <a href="/" class="group flex items-center gap-3" aria-label="FlexyDay home">
      <span
        class="flex h-10 w-10 items-center justify-center rounded-2xl shadow-soft transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105"
        style="background: linear-gradient(135deg, var(--company-dot) 0%, var(--local-dot) 100%);"
      >
        <CalendarRange size={20} class="text-paper" />
      </span>
      <span class="leading-tight">
        <span class="block text-[17px] font-extrabold tracking-tight text-ink">FlexyDay</span>
        <span class="block text-[11px] font-medium text-ink-muted">
          Cross-border holiday swaps
        </span>
      </span>
    </a>

    <div class="flex items-center gap-2.5">
      {#if statusText}
        <p
          class="tabular hidden items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-medium text-ink-muted md:inline-flex"
        >
          <span class="relative flex h-2 w-2">
            <span
              class="absolute inline-flex h-full w-full animate-ping rounded-full bg-earn-dot opacity-60"
            ></span>
            <span class="relative inline-flex h-2 w-2 rounded-full bg-earn-dot"></span>
          </span>
          {statusText}
        </p>
      {/if}
      <ThemeToggle />
    </div>
  </div>
</header>

<script lang="ts">
  import { CalendarOff, X } from "@lucide/svelte";
  import { formatFullDate } from "$lib/holidays/dates";
  import type { Holiday } from "$lib/holidays/types";

  interface Props {
    dates: readonly string[];
    holidays: Map<string, Holiday>;
    tone: "worked" | "taken";
    /**
     * Shown in a placeholder when the list is empty. Omit it and an empty list
     * renders nothing at all, which is what a panel wants when it already explains
     * itself elsewhere.
     */
    emptyText?: string;
    onremove: (date: string) => void;
  }

  let { dates, holidays, tone, emptyText, onremove }: Props = $props();

  const isWorked = $derived(tone === "worked");
</script>

{#if dates.length === 0}
  {#if emptyText}
    <div
      class="flex items-center gap-2.5 rounded-xl border border-dashed border-line-strong bg-paper px-3.5 py-3.5 text-sm text-ink-muted"
    >
      <CalendarOff size={16} class="shrink-0 text-ink-faint" />
      <p>{emptyText}</p>
    </div>
  {/if}
{:else}
  <ul class="space-y-1.5">
    {#each dates as date (date)}
      {@const holiday = holidays.get(date)}
      <li
        class="group flex items-start justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm transition-all duration-200 hover:-translate-y-px hover:shadow-soft {isWorked
          ? 'border-earn-dot/40 bg-earn'
          : 'border-spend-dot/40 bg-spend'}"
      >
        <span class="min-w-0">
          <span class="block truncate font-bold {isWorked ? 'text-earn-ink' : 'text-spend-ink'}">
            {holiday?.name ?? date}
          </span>
          {#if holiday?.nameNative}
            <span class="block truncate text-xs opacity-75 {isWorked ? 'text-earn-ink' : 'text-spend-ink'}">
              {holiday.nameNative}
            </span>
          {/if}
          <span class="tabular block text-xs font-medium opacity-70 {isWorked ? 'text-earn-ink' : 'text-spend-ink'}">
            {formatFullDate(date, "en")}
          </span>
        </span>
        <button
          type="button"
          class="rounded-lg p-1.5 opacity-60 transition-all duration-200 group-hover:opacity-100 hover:bg-black/10 active:scale-90 {isWorked
            ? 'text-earn-ink'
            : 'text-spend-ink'}"
          aria-label="Remove {date}"
          onclick={() => onremove(date)}
        >
          <X size={14} />
        </button>
      </li>
    {/each}
  </ul>
{/if}

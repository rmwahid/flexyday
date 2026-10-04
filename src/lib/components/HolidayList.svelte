<script lang="ts">
  import { groupByMonth } from "$lib/holidays/days";
  import { formatMonthYear } from "$lib/holidays/dates";
  import { Check, Search } from "@lucide/svelte";
  import type { Holiday } from "$lib/holidays/types";

  interface Props {
    /** What marking a day in this list means. */
    action: "worked" | "taken";
    holidays: Holiday[];
    selectedDates: ReadonlySet<string>;
    /** Hide the internal label when the surrounding card already has a title. */
    showLabel?: boolean;
    /** Scroll classes for the list container, so a parent can take over scrolling. */
    listClass?: string;
    ontoggle: (date: string) => void;
  }

  let { action, holidays, selectedDates, showLabel = true, listClass = "max-h-[22rem] overflow-y-auto", ontoggle }: Props = $props();

  let query = $state("");

  const actionLabel = $derived(action === "worked" ? "Work through" : "Take instead");
  const isWorked = $derived(action === "worked");

  const groups = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    const source =
      needle === ""
        ? holidays
        : holidays.filter(
            (holiday) =>
              holiday.name.toLowerCase().includes(needle) ||
              (holiday.nameNative?.toLowerCase().includes(needle) ?? false) ||
              holiday.date.includes(needle),
          );
    // Order follows the input, which the page already sorts upcoming first.
    return groupByMonth(source);
  });
</script>

<div class="flex min-h-0 flex-col xl:flex-1">
  <label class="block shrink-0" for="search-{action}">
    {#if showLabel}
      <span class="text-[11px] font-bold tracking-widest text-ink-muted uppercase">{actionLabel}</span>
    {/if}
    <span class="relative mt-1.5 block">
      <Search
        size={15}
        class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-faint"
      />
      <input
        id="search-{action}"
        type="search"
        placeholder="Search by name or date"
        bind:value={query}
        class="w-full rounded-xl border border-line bg-paper py-2.5 pr-3 pl-10 text-sm text-ink transition-all duration-200 outline-none placeholder:text-ink-faint hover:border-line-strong focus:border-accent focus:ring-2 focus:ring-accent/30"
      />
    </span>
  </label>

  {#if groups.length === 0}
    <p class="mt-2.5 rounded-xl border border-dashed border-line-strong bg-paper px-3 py-4 text-center text-sm text-ink-muted">
      {holidays.length === 0 ? "No holidays loaded yet." : "Nothing matches that search."}
    </p>
  {:else}
    <div class="mt-3 space-y-4 pr-1 {listClass}">
      {#each groups as [monthKey, monthHolidays] (monthKey)}
        <div>
          <p class="sticky top-0 bg-panel/95 py-1 text-[11px] font-bold tracking-wider text-ink-faint uppercase backdrop-blur">
            {formatMonthYear(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)), "en")}
          </p>
          <ul class="mt-1.5 space-y-1.5">
            {#each monthHolidays as holiday (holiday.date)}
              {@const isSelected = selectedDates.has(holiday.date)}
              <li>
                <button
                  type="button"
                  class="group flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-all duration-200 active:scale-[0.98] {isSelected
                    ? isWorked
                      ? 'border-earn-dot/50 bg-earn shadow-soft'
                      : 'border-spend-dot/50 bg-spend shadow-soft'
                    : 'border-line bg-paper hover:-translate-y-px hover:border-line-strong hover:shadow-soft'}"
                  onclick={() => ontoggle(holiday.date)}
                  aria-pressed={isSelected}
                >
                  <span
                    class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200 {isSelected
                      ? isWorked
                        ? 'border-earn-dot bg-earn-dot text-paper'
                        : 'border-spend-dot bg-spend-dot text-paper'
                      : 'border-line-strong text-transparent group-hover:border-ink-faint'}"
                    aria-hidden="true"
                  >
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="flex items-baseline justify-between gap-2">
                      <span class="truncate font-semibold {isSelected ? (isWorked ? 'text-earn-ink' : 'text-spend-ink') : 'text-ink'}">{holiday.name}</span>
                      <span class="tabular shrink-0 text-xs font-medium opacity-60">
                        {holiday.date.slice(8, 10)}/{holiday.date.slice(5, 7)}
                      </span>
                    </span>
                    {#if holiday.nameNative}
                      <span class="block truncate text-xs opacity-70">{holiday.nameNative}</span>
                    {/if}
                    {#if holiday.kind === "joint-leave"}
                      <span class="mt-0.5 inline-block rounded-full bg-accent-soft px-1.5 py-px text-[10px] font-bold text-accent">
                        Joint leave
                      </span>
                    {/if}
                  </span>
                </button>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
  {/if}
</div>

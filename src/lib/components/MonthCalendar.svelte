<script lang="ts">
  import type { Holiday } from "$lib/holidays/types";
  import { dayOrigin, type DayOrigin } from "$lib/holidays/days";
  import { buildMonthGrid, formatMonthYear, weekdayLabels } from "$lib/holidays/dates";

  interface Props {
    year: number;
    month: number;
    companyHolidays: Map<string, Holiday>;
    localHolidays: Map<string, Holiday>;
    /** Company side: days worked through, which earn a day. */
    workedDates: ReadonlySet<string>;
    /** Days taken off, which spend a day. */
    takenDates: ReadonlySet<string>;
    todayIso?: string;
    interactive?: boolean;
    onselect?: (date: string) => void;
  }

  let {
    year,
    month,
    companyHolidays,
    localHolidays,
    workedDates,
    takenDates,
    todayIso = "",
    interactive = false,
    onselect,
  }: Props = $props();

  const weeks = $derived(buildMonthGrid(year, month));
  const weekdays = $derived(weekdayLabels("en"));
  const label = $derived(formatMonthYear(year, month, "en"));

  const monthKey = $derived(`${year}-${String(month).padStart(2, "0")}`);
  const count = $derived(
    [...new Set([...companyHolidays.keys(), ...localHolidays.keys()])].filter((date) =>
      date.startsWith(monthKey),
    ).length,
  );

  function originFor(date: string): DayOrigin {
    return dayOrigin(date, companyHolidays, localHolidays);
  }

  /**
   * One tone class per day. Both-holidays days use a diagonal split so the legend
   * can explain the colour without a second element in the cell.
   */
  function toneFor(
    date: string,
  ): { cls: string; style?: string; label: string; marked: "worked" | "taken" | null } {
    const origin = originFor(date);
    const worked = workedDates.has(date);
    const taken = takenDates.has(date);

    let cls = "";
    let style: string | undefined;
    let label: string;

    if (origin === "company") {
      cls = "bg-company text-company-ink";
      label = "Company holiday";
    } else if (origin === "local") {
      cls = "bg-local text-local-ink";
      label = "Local holiday";
    } else if (origin === "both") {
      style = "background: linear-gradient(135deg, var(--company) 0 49.5%, var(--local) 50.5% 100%)";
      label = "Company and local holiday";
    } else {
      cls = "text-ink";
      label = "Working day";
    }

    const companyHoliday = companyHolidays.get(date);
    const localHoliday = localHolidays.get(date);
    const fullName =
      origin === "both"
        ? `${companyHoliday?.name ?? "Holiday"} / ${localHoliday?.name ?? "Holiday"}`
        : (companyHoliday?.name ?? localHoliday?.name ?? null);

    if (worked) {
      cls = "bg-earn text-earn-ink font-bold ring-2 ring-earn-dot/70";
      label = `Worked through, earns a day. ${fullName ?? label}`;
    } else if (taken) {
      cls = "bg-spend text-spend-ink font-bold ring-2 ring-spend-dot/70";
      label = `Taken off, spends a day. ${fullName ?? label}`;
    } else if (fullName) {
      label = `${fullName}, ${label.toLowerCase()}`;
    }

    return { cls, style, label, marked: worked ? "worked" : taken ? "taken" : null };
  }
</script>

<div
  class="group rounded-2xl border border-line bg-panel p-3 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-pop"
>
  <p class="mb-2 flex items-baseline justify-between px-1">
    <span class="text-[13px] font-bold tracking-tight text-ink">{label}</span>
    <span
      class="tabular rounded-full bg-panel-soft px-2 py-0.5 text-[10px] font-semibold text-ink-muted"
    >
      {count} {count === 1 ? "holiday" : "holidays"}
    </span>
  </p>

  <div class="grid grid-cols-7">
    {#each weekdays as weekday (weekday)}
      <div class="pb-1 text-center text-[9px] font-bold tracking-wider text-ink-faint uppercase">
        {weekday.slice(0, 2)}
      </div>
    {/each}
  </div>

  {#each weeks as week, weekIndex (weekIndex)}
    <div class="grid grid-cols-7">
      {#each week as cell (cell.date)}
        {@const canSelect = interactive && cell.inMonth}
        {@const tone = toneFor(cell.date)}
        {@const isToday = cell.date === todayIso}

        {#if canSelect}
          <button
            type="button"
            class="tabular relative mx-auto my-[3px] flex h-8 w-8 flex-col items-center justify-center rounded-lg text-[13px] transition-all duration-200 {tone.cls} {cell.inMonth
              ? ''
              : 'opacity-30'} {isToday && !tone.marked
              ? 'ring-2 ring-accent ring-offset-1 ring-offset-panel'
              : ''} hover:scale-110 hover:shadow-soft active:scale-95 focus:outline-2 focus:outline-offset-1 focus:outline-accent"
            style={tone.style}
            onclick={() => onselect?.(cell.date)}
            title={tone.label}
            aria-label="{cell.date}: {tone.label}"
          >
            <span class="leading-none">{Number(cell.date.slice(8, 10))}</span>
            {#if tone.marked}
              <span
                class="mt-0.5 h-1 w-1 rounded-full {tone.marked === 'worked'
                  ? 'bg-earn-dot'
                  : 'bg-spend-dot'}"
              ></span>
            {:else if cell.inMonth && (originFor(cell.date) === 'company' || originFor(cell.date) === 'local' || originFor(cell.date) === 'both')}
              <span
                class="mt-0.5 h-1 w-1 rounded-full {originFor(cell.date) === 'company'
                  ? 'bg-company-dot'
                  : originFor(cell.date) === 'local'
                    ? 'bg-local-dot'
                    : 'bg-ink-faint'}"
              ></span>
            {/if}
          </button>
        {:else}
          <div
            class="tabular relative mx-auto my-[3px] flex h-8 w-8 flex-col items-center justify-center rounded-lg text-[13px] {tone.cls} {cell.inMonth
              ? ''
              : 'opacity-25'}"
            style={tone.style}
            title={tone.label}
          >
            <span class="leading-none">{Number(cell.date.slice(8, 10))}</span>
            {#if tone.marked}
              <span
                class="mt-0.5 h-1 w-1 rounded-full {tone.marked === 'worked'
                  ? 'bg-earn-dot'
                  : 'bg-spend-dot'}"
              ></span>
            {/if}
          </div>
        {/if}
      {/each}
    </div>
  {/each}
</div>

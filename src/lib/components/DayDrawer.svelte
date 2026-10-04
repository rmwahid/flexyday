<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { Briefcase, CalendarCheck, CalendarPlus, Check, Undo2, X } from "@lucide/svelte";
  import { dayOrigin } from "$lib/holidays/days";
  import { formatFullDate } from "$lib/holidays/dates";
  import type { Holiday } from "$lib/holidays/types";

  interface Props {
    open?: boolean;
    date: string;
    companyHoliday: Holiday | undefined;
    localHoliday: Holiday | undefined;
    companyHolidays: ReadonlyMap<string, Holiday>;
    localHolidays: ReadonlyMap<string, Holiday>;
    isWorked: boolean;
    isTaken: boolean;
    companyLabel: string;
    employeeLabel: string;
    onwork: () => void;
    ontake: () => void;
    onclose: () => void;
  }

  let {
    open = false,
    date,
    companyHoliday,
    localHoliday,
    companyHolidays,
    localHolidays,
    isWorked,
    isTaken,
    companyLabel,
    employeeLabel,
    onwork,
    ontake,
    onclose,
  }: Props = $props();

  const origin = $derived(dayOrigin(date, companyHolidays, localHolidays));
  const isCompanyDay = $derived(origin === "company" || origin === "both");
  const dayName = $derived(
    origin === "company"
      ? (companyHoliday?.name ?? "Company holiday")
      : origin === "both"
        ? (companyHoliday?.name ?? "Shared holiday")
        : origin === "local"
          ? (localHoliday?.name ?? "Local holiday")
          : "Ordinary working day",
  );
  const dayNative = $derived(companyHoliday?.nameNative ?? localHoliday?.nameNative);
  const holidayKind = $derived(companyHoliday?.kind ?? localHoliday?.kind);

  const badge = $derived(
    origin === "both"
      ? { cls: "bg-accent-soft text-accent", text: "Both countries" }
      : origin === "company"
        ? { cls: "bg-company text-company-ink", text: companyLabel }
        : origin === "local"
          ? { cls: "bg-local text-local-ink", text: employeeLabel }
          : { cls: "bg-panel-soft text-ink-muted", text: "Working day" },
  );

  function onkeydown(event: KeyboardEvent) {
    if (open && event.key === "Escape") onclose();
  }
</script>

<svelte:window {onkeydown} />

{#if open}
  <div
    class="fixed inset-0 z-40 bg-ink/45 backdrop-blur-[3px]"
    transition:fade={{ duration: 180 }}
    aria-hidden="true"
    onclick={onclose}
  ></div>

  <div
    class="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-hidden bg-panel shadow-pop sm:m-3 sm:w-[min(27rem,100vw)] sm:rounded-3xl sm:border sm:border-line sm:inset-y-3"
    transition:fly={{ x: 380, duration: 300, opacity: 1 }}
    role="dialog"
    aria-modal="true"
    aria-label="Day details for {date}"
  >
    <div
      class="relative shrink-0 overflow-hidden px-6 pt-6 pb-5 {origin === 'company'
        ? 'bg-company'
        : origin === 'local'
          ? 'bg-local'
          : origin === 'both'
            ? 'bg-accent-soft'
            : 'bg-panel-soft'}"
    >
      <div class="flex items-start justify-between gap-3">
        <span class="rounded-full px-3 py-1 text-[11px] font-bold tracking-widest uppercase {badge.cls}">
          {badge.text}
        </span>
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-xl bg-ink/5 text-ink transition-all duration-200 hover:bg-ink/10 active:scale-90"
          onclick={onclose}
          aria-label="Close day details"
        >
          <X size={16} />
        </button>
      </div>
      <h2 class="mt-3 text-2xl font-extrabold tracking-tight text-ink">{dayName}</h2>
      {#if dayNative}
        <p class="mt-0.5 text-[15px] font-medium text-ink-muted">{dayNative}</p>
      {/if}
      <p class="tabular mt-1.5 flex items-center gap-2 text-sm font-semibold text-ink-muted">
        {formatFullDate(date, "en")}
        {#if holidayKind === "joint-leave"}
          <span class="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold tracking-wide text-accent-ink uppercase">
            Joint leave
          </span>
        {/if}
      </p>
    </div>

    <div class="flex-1 space-y-3 overflow-y-auto px-6 py-5">
      {#if isWorked}
        <p class="flex items-center gap-2.5 rounded-2xl bg-earn px-4 py-3 text-sm font-semibold text-earn-ink">
          <Check size={16} class="shrink-0" />
          Worked through. This day earns one day off.
        </p>
      {/if}
      {#if isTaken}
        <p class="flex items-center gap-2.5 rounded-2xl bg-spend px-4 py-3 text-sm font-semibold text-spend-ink">
          <Check size={16} class="shrink-0" />
          Taken off. This day spends one earned day.
        </p>
      {/if}

      {#if origin === "both"}
        <div class="rounded-2xl border border-line bg-paper px-4 py-3 text-sm leading-relaxed">
          <p class="flex items-center gap-2 font-bold text-ink">
            <Briefcase size={15} class="text-company-dot" />
            {companyHoliday?.name ?? "Company holiday"}
          </p>
          <p class="mt-1 flex items-center gap-2 font-bold text-ink">
            <CalendarCheck size={15} class="text-local-dot" />
            {localHoliday?.name ?? "Local holiday"}
          </p>
          <p class="mt-2 text-ink-muted">
            Both countries rest on this day. Work through it to earn a day, or take it as usual.
          </p>
        </div>
      {:else}
        <p class="rounded-2xl border border-line bg-paper px-4 py-3 text-sm leading-relaxed text-ink-muted">
          {#if isCompanyDay}
            A {companyLabel} holiday, so you are off anyway. Mark it as worked through and the
            day goes into your balance instead.
          {:else if origin === "local"}
            A {employeeLabel} holiday your {companyLabel} employer does not observe, so taking it
            spends one earned day.
          {:else}
            An ordinary working day. Taking it spends one earned day. If the balance does not
            cover it, the difference comes from your own leave.
          {/if}
        </p>
      {/if}
    </div>

    <div class="shrink-0 space-y-2 border-t border-line bg-panel px-6 py-5">
      {#if isCompanyDay}
        <button
          type="button"
          class="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-[15px] font-bold transition-all duration-200 hover:-translate-y-px hover:shadow-pop active:translate-y-0 active:scale-[0.98] {isWorked
            ? 'bg-panel-soft text-ink-muted hover:text-ink'
            : 'bg-earn-ink text-paper shadow-soft'}"
          onclick={onwork}
        >
          {#if isWorked}
            <Undo2 size={17} />
            Stop working through this day
          {:else}
            <Briefcase size={17} />
            Work through this day
          {/if}
        </button>
      {:else}
        <button
          type="button"
          class="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-[15px] font-bold transition-all duration-200 hover:-translate-y-px hover:shadow-pop active:translate-y-0 active:scale-[0.98] {isTaken
            ? 'bg-panel-soft text-ink-muted hover:text-ink'
            : 'bg-spend-ink text-paper shadow-soft'}"
          onclick={ontake}
        >
          {#if isTaken}
            <Undo2 size={17} />
            Stop taking this day
          {:else}
            <CalendarPlus size={17} />
            Take this day off
          {/if}
        </button>
      {/if}
    </div>
  </div>
{/if}

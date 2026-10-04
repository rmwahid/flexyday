<script lang="ts">
  import { CalendarRange, Eye } from "@lucide/svelte";
  import { page } from "$app/state";
  import BalanceCard from "$lib/components/BalanceCard.svelte";
  import Legend from "$lib/components/Legend.svelte";
  import MarkedList from "$lib/components/MarkedList.svelte";
  import MonthCalendar from "$lib/components/MonthCalendar.svelte";
  import TopBar from "$lib/components/TopBar.svelte";
  import { countryLabel } from "$lib/holidays/countries";
  import { balance } from "$lib/holidays/swap";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  const companyLabel = $derived(countryLabel(data.plan.companyCountry));
  const employeeLabel = $derived(countryLabel(data.plan.employeeCountry));

  const companyByDate = $derived(new Map(data.companyHolidays.map((h) => [h.date, h])));
  const employeeByDate = $derived(new Map(data.employeeHolidays.map((h) => [h.date, h])));

  const worked = $derived(new Set(data.plan.workedDates));
  const spent = $derived(new Set(data.plan.takenDates));

  const currentBalance = $derived(balance(data.plan));
  const balanceStatement = $derived.by(() => {
    if (currentBalance > 0) return `${currentBalance} day(s) still owed to them`;
    if (currentBalance < 0) {
      return `${Math.abs(currentBalance)} day(s) covered from their own leave allowance`;
    }
    return "Even: every taken day is paid for.";
  });

  const sortedYears = $derived([...data.years].sort());
  const windowLabel = $derived(
    sortedYears.length > 0
      ? `Covering ${sortedYears.join(", ")}`
      : "No days marked",
  );

  const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  /** Shared link-summary line used for the description and OG meta tags. */
  const summaryLine = $derived.by(() => {
    const workedCount = data.plan.workedDates.length;
    const takenCount = data.plan.takenDates.length;
    const total = workedCount + takenCount;
    if (total === 0) return "A read-only shared schedule with no days marked yet.";
    return `Read-only schedule: ${workedCount} day(s) worked through, ${takenCount} taken. Expires 30 days after creation.`;
  });
</script>

<svelte:head>
  <title>{companyLabel} and {employeeLabel} holiday swap - FlexyDay</title>
  <meta name="description" content={summaryLine} />
  <meta property="og:title" content={`${companyLabel} and ${employeeLabel} holiday swap`} />
  <meta property="og:description" content={summaryLine} />
  <meta property="og:type" content="website" />
  <meta property="og:url" content={page.url.href} />
  <meta property="og:image" content={`${page.url.origin}/og.png`} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
</svelte:head>

<TopBar />

<main class="mx-auto max-w-[1400px] px-5 pb-28 sm:px-8">
  <section class="relative pt-10 sm:pt-14">
    <div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
      <div
        class="aurora-drift absolute -top-24 right-[8%] h-72 w-72 rounded-full bg-local-dot/25 blur-3xl"
      ></div>
      <div
        class="aurora-drift absolute top-10 left-[2%] h-64 w-64 rounded-full bg-company-dot/20 blur-3xl"
        style="animation-delay: -8s"
      ></div>
    </div>

    <div class="grid items-center gap-8 lg:grid-cols-[1.02fr_0.98fr]">
      <div>
        <p
          class="rise inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3.5 py-1.5 text-xs font-bold text-ink-muted shadow-soft"
        >
          <Eye size={13} class="text-accent" />
          Shared schedule, read only
        </p>
        <h1 class="mt-4 text-4xl leading-[1.08] font-extrabold tracking-tight text-ink sm:text-5xl">
          {companyLabel} and {employeeLabel}
        </h1>
        <p class="mt-4 max-w-[52ch] text-[16px] leading-relaxed text-ink-muted">
          {#if data.plan.employeeName}
            Prepared for {data.plan.employeeName}. Read only, expires 30 days after it was
            created.
          {:else}
            Read only, expires 30 days after it was created.
          {/if}
        </p>
        <p class="tabular mt-3 inline-flex rounded-full border border-line bg-panel px-3.5 py-1.5 text-xs font-bold text-ink-muted">
          {windowLabel}
        </p>
      </div>

      <div class="rise" style="animation-delay: 150ms">
        <BalanceCard
          value={currentBalance}
          earned={data.plan.workedDates.length}
          spent={data.plan.takenDates.length}
          statement={balanceStatement}
        />
      </div>
    </div>
  </section>

  <section class="mt-12">
    <h2 class="text-2xl font-extrabold tracking-tight text-ink">One timeline</h2>
    <p class="mt-1 max-w-[62ch] text-[15px] leading-relaxed text-ink-muted">
      The months this schedule touches. Days with a dot are holidays.
    </p>
    <div class="mt-4"><Legend {companyLabel} localLabel={employeeLabel} /></div>

    <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each sortedYears as yearText (yearText)}
        {@const year = Number(yearText)}
        {#each MONTHS as month (month)}
          <MonthCalendar
            {year}
            {month}
            companyHolidays={companyByDate}
            localHolidays={employeeByDate}
            workedDates={worked}
            takenDates={spent}
          />
        {/each}
      {/each}
    </div>
  </section>

  <section class="mt-12">
    <h2 class="text-2xl font-extrabold tracking-tight text-ink">Summary</h2>
    <p class="mt-1 text-[15px] text-ink-muted">What was earned, what was spent, and the difference.</p>

    {#if data.plan.workedDates.length === 0 && data.plan.takenDates.length === 0}
      <div class="mt-4 rounded-3xl border border-dashed border-line-strong bg-panel px-6 py-12 text-center">
        <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-panel-soft text-ink-muted">
          <CalendarRange size={26} />
        </span>
        <p class="mt-4 font-bold text-ink">This schedule has nothing marked</p>
      </div>
    {:else}
      <div class="mt-4 grid gap-6 lg:grid-cols-2">
        <div class="rounded-3xl border border-earn-dot/40 bg-earn p-6">
          <h3 class="text-xs font-extrabold tracking-widest text-earn-ink uppercase">
            Earned, worked through ({data.plan.workedDates.length})
          </h3>
          <div class="mt-3">
            <MarkedList
              dates={data.plan.workedDates}
              holidays={companyByDate}
              tone="worked"
              emptyText="None."
              onremove={() => {}}
            />
          </div>
        </div>

        <div class="rounded-3xl border border-spend-dot/40 bg-spend p-6">
          <h3 class="text-xs font-extrabold tracking-widest text-spend-ink uppercase">
            Spent, days off ({data.plan.takenDates.length})
          </h3>
          <div class="mt-3">
            <MarkedList
              dates={data.plan.takenDates}
              holidays={employeeByDate}
              tone="taken"
              emptyText="None."
              onremove={() => {}}
            />
          </div>
        </div>
      </div>

      <div class="mt-5">
        <BalanceCard
          value={currentBalance}
          earned={data.plan.workedDates.length}
          spent={data.plan.takenDates.length}
          statement={balanceStatement}
        />
      </div>
    {/if}
  </section>

  <p class="mt-12 text-center text-xs text-ink-faint">
    Want your own schedule? Open FlexyDay and create one.
  </p>
</main>

<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import {
    ArrowDown,
    Braces,
    Briefcase,
    CalendarCheck,
    CalendarPlus,
    Check,
    Copy,
    Download,
    Link2,
    RotateCcw,
    Sparkles,
    Upload,
  } from "@lucide/svelte";
  import BalanceCard from "$lib/components/BalanceCard.svelte";
  import CountryPicker from "$lib/components/CountryPicker.svelte";
  import DayDrawer from "$lib/components/DayDrawer.svelte";
  import HolidayList from "$lib/components/HolidayList.svelte";
  import Legend from "$lib/components/Legend.svelte";
  import MarkedList from "$lib/components/MarkedList.svelte";
  import MonthCalendar from "$lib/components/MonthCalendar.svelte";
  import TopBar from "$lib/components/TopBar.svelte";
  import WindowPager from "$lib/components/WindowPager.svelte";
  import { countryLabel } from "$lib/holidays/countries";
  import { createShareLink, fetchHolidays, type HolidayResponse } from "$lib/holidays/api";
  import { formatFullDate } from "$lib/holidays/dates";
  import { sortChronological, sortChronologicalDates } from "$lib/holidays/days";
  import { buildCalendar } from "$lib/holidays/ics-export";
  import { validateSharePayload } from "$lib/holidays/share";
  import { balance, createPlan, isTakenDate, isWorkedDate, toggleTakenDate, toggleWorkedDate } from
    "$lib/holidays/swap";
  import type { Holiday, SharePayload, SwapPlan } from "$lib/holidays/types";

  type LoadState =
    | { status: "loading" }
    | { status: "ready"; data: HolidayResponse }
    | { status: "error"; message: string };

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const MONTHS_IN_WINDOW = 12;

  /**
   * Going back has a floor: January of the current year is the earliest start, so
   * the arrow cannot walk into a year that is already gone. The feeds carry about
   * a decade of history, which is fine to store but useless to plan against.
   */
  const MIN_START_YEAR = today.getUTCFullYear();
  const MIN_START_MONTH = 1;
  const MIN_START_ISO = `${MIN_START_YEAR}-01-01`;

  const headlineWords = ["Work", "their", "day", "off.", "Take", "yours."];

  let plan = $state<SwapPlan>(createPlan("hong_kong", "indonesian"));

  // The timeline is a rolling 12-month window that starts at the current month and
  // therefore crosses years. Paging slides it one month at a time so every month
  // can be reached, and stops at January of the current year going back.
  let startYear = $state(today.getUTCFullYear());
  let startMonth = $state(today.getUTCMonth() + 1);

  let companyState = $state<LoadState>({ status: "loading" });
  let employeeState = $state<LoadState>({ status: "loading" });

  let drawerOpen = $state(false);
  let drawerDate = $state("");

  let shareResult = $state<{ url: string; expiresAt: string } | null>(null);
  let copied = $state(false);
  let notice = $state<{ kind: "error" | "info"; message: string } | null>(null);

  const companyLabel = $derived(countryLabel(plan.companyCountry));
  const employeeLabel = $derived(countryLabel(plan.employeeCountry));
  const sameCountry = $derived(plan.companyCountry === plan.employeeCountry);

  const companyByDate: Map<string, Holiday> = $derived(
    new Map(
      (companyState.status === "ready" ? companyState.data.holidays : []).map((h) => [h.date, h]),
    ),
  );
  const employeeByDate: Map<string, Holiday> = $derived(
    new Map(
      (employeeState.status === "ready" ? employeeState.data.holidays : []).map((h) => [h.date, h]),
    ),
  );

  const companyHolidays: Holiday[] = $derived(
    companyState.status === "ready" ? companyState.data.holidays : [],
  );
  const employeeHolidays: Holiday[] = $derived(
    employeeState.status === "ready" ? employeeState.data.holidays : [],
  );
  const workedSet = $derived(new Set(plan.workedDates));
  const spentSet = $derived(new Set(plan.takenDates));

  const currentBalance = $derived(balance(plan));
  const balanceStatement = $derived.by(() => {
    if (sameCountry) return "Pick two different countries to start.";
    if (currentBalance > 0) return `${currentBalance} day(s) still owed to you`;
    if (currentBalance < 0) return `${Math.abs(currentBalance)} day(s) to cover from your own leave`;
    return "Even: every taken day is paid for.";
  });

  /** Twelve consecutive months from the chosen start, crossing years freely. */
  const windowMonths = $derived.by(() => {
    const months: { year: number; month: number }[] = [];
    for (let index = 0; index < MONTHS_IN_WINDOW; index += 1) {
      const total = startYear * 12 + (startMonth - 1) + index;
      months.push({ year: Math.floor(total / 12), month: (total % 12) + 1 });
    }
    return months;
  });

  const windowKeys = $derived(
    new Set(
      windowMonths.map(
        (entry) => `${entry.year}-${String(entry.month).padStart(2, "0")}`,
      ),
    ),
  );

  const windowLabel = $derived.by(() => {
    const first = windowMonths[0];
    const last = windowMonths[windowMonths.length - 1];
    const formatter = new Intl.DateTimeFormat("en", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
    const start = formatter.format(new Date(Date.UTC(first.year, first.month - 1, 1)));
    const end = formatter.format(new Date(Date.UTC(last.year, last.month - 1, 1)));
    return `${start} to ${end}`;
  });

  const windowStartsAtEarliest = $derived(
    startYear === MIN_START_YEAR && startMonth === MIN_START_MONTH,
  );

  const windowStartsThisMonth = $derived(
    startYear === today.getUTCFullYear() && startMonth === today.getUTCMonth() + 1,
  );

  /** Live counts for the months currently in view. Real data, not decoration. */
  const windowStats = $derived.by(() => {
    const companyInView = companyHolidays.filter((holiday) =>
      windowKeys.has(holiday.date.slice(0, 7)),
    );
    const localInView = employeeHolidays.filter((holiday) =>
      windowKeys.has(holiday.date.slice(0, 7)),
    );
    const companyDates = new Set(companyInView.map((holiday) => holiday.date));
    const shared = localInView.filter((holiday) => companyDates.has(holiday.date)).length;
    return { company: companyInView.length, local: localInView.length, shared };
  });

  const statusText = $derived(
    companyState.status === "ready"
      ? `Data read ${formatFullDate(companyState.data.fetchedAt.slice(0, 10), "en")}`
      : null,
  );

  const hasMarks = $derived(plan.workedDates.length > 0 || plan.takenDates.length > 0);

  /**
   * Both picker lists are built the same way: every holiday from the planning horizon
   * onwards, in date order, and selected entries stay in the list.
   *
   * Do not filter chosen days out: `HolidayList` renders a checked, still clickable
   * row for a selected date, and keeping it lets the selection be undone from the
   * list itself, exactly like the other list.
   */
  const workedList = $derived(
    sortChronological(companyHolidays.filter((holiday) => holiday.date >= MIN_START_ISO)),
  );
  const takenList: Holiday[] = $derived(
    sortChronological(employeeHolidays.filter((holiday) => holiday.date >= MIN_START_ISO)),
  );
  const workedRows = $derived(sortChronologicalDates(plan.workedDates));
  const takenRows = $derived(sortChronologicalDates(plan.takenDates));

  async function load(token: string, target: "company" | "employee") {
    const assign = (state: LoadState) =>
      target === "company" ? (companyState = state) : (employeeState = state);

    assign({ status: "loading" });
    try {
      assign({ status: "ready", data: await fetchHolidays(token) });
    } catch (error) {
      assign({
        status: "error",
        message: error instanceof Error ? error.message : "Something went wrong",
      });
    }
  }

  onMount(() => {
    void load(plan.companyCountry, "company");
    void load(plan.employeeCountry, "employee");
  });

  function onCompanyChange(token: string) {
    plan = createPlan(token, plan.employeeCountry);
    shareResult = null;
    void load(token, "company");
  }

  function onEmployeeChange(token: string) {
    plan = createPlan(plan.companyCountry, token);
    shareResult = null;
    void load(token, "employee");
  }

  /** Moves the window one month at a time and refuses to go before January. */
  function shiftWindow(months: number) {
    const total = startYear * 12 + (startMonth - 1) + months;
    const year = Math.floor(total / 12);
    if (year < MIN_START_YEAR) return;
    startYear = year;
    startMonth = (total % 12) + 1;
  }

  function resetWindow() {
    startYear = today.getUTCFullYear();
    startMonth = today.getUTCMonth() + 1;
  }

  function toggleWorked(date: string) {
    plan = toggleWorkedDate(plan, date);
    shareResult = null;
  }

  function toggleTaken(date: string) {
    plan = toggleTakenDate(plan, date);
    shareResult = null;
  }

  function removeFromPanel(date: string) {
    plan = {
      ...plan,
      workedDates: plan.workedDates.filter((d) => d !== date),
      takenDates: plan.takenDates.filter((d) => d !== date),
    };
    shareResult = null;
  }

  function toPayload(): SharePayload {
    return { ...plan, createdAt: new Date().toISOString() };
  }

  async function share() {
    notice = null;
    const result = validateSharePayload(toPayload());
    if (!result.ok) {
      notice = { kind: "error", message: result.error };
      return;
    }
    try {
      shareResult = await createShareLink(result.value);
      copied = false;
    } catch (error) {
      notice = {
        kind: "error",
        message: error instanceof Error ? error.message : "The link could not be created",
      };
    }
  }

  async function copyLink() {
    if (!shareResult) return;
    try {
      await navigator.clipboard.writeText(shareResult.url);
    } catch {
      // Clipboard API rejected the write (needs a user gesture or secure
      // context): fall back to copying from a temporary selection.
      const helper = document.createElement("textarea");
      helper.value = shareResult.url;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
    }
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  function download(filename: string, content: string, type: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function downloadJson() {
    download("flexyday-schedule.json", JSON.stringify(toPayload(), null, 2), "application/json");
  }

  function downloadIcs() {
    const workedEvents = plan.workedDates.map((date) => {
      const holiday = companyByDate.get(date);
      return {
        uid: `worked-${date}@flexyday`,
        date,
        summary: `Working: ${holiday?.name ?? "Company holiday"}`,
        description: `Company holiday in ${companyLabel} worked through, earning a day off.`,
      };
    });
    const takenEvents = plan.takenDates.map((date) => {
      const holiday = employeeByDate.get(date);
      return {
        uid: `taken-${date}@flexyday`,
        date,
        summary: `Day off: ${holiday?.name ?? "Requested day off"}`,
        description: `Day off in ${employeeLabel}.`,
      };
    });

    download(
      "flexyday-schedule.ics",
      buildCalendar([...workedEvents, ...takenEvents]),
      "text/calendar",
    );
  }

  async function importJson(event: Event) {
    notice = null;
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    try {
      // The file is editable by hand, so it gets exactly the same validation as a
      // share link before anything is applied.
      const result = validateSharePayload(JSON.parse(await file.text()));
      if (!result.ok) {
        notice = { kind: "error", message: result.error };
        return;
      }

      plan = {
        companyCountry: result.value.companyCountry,
        employeeCountry: result.value.employeeCountry,
        workedDates: result.value.workedDates,
        takenDates: result.value.takenDates,
      };
      shareResult = null;
      notice = {
        kind: "info",
        message: `Imported ${result.value.workedDates.length} worked and ${result.value.takenDates.length} taken days.`,
      };
      await Promise.all([
        load(plan.companyCountry, "company"),
        load(plan.employeeCountry, "employee"),
      ]);
    } catch {
      notice = { kind: "error", message: "That file is not valid JSON." };
    }
  }

  function reset() {
    plan = createPlan(plan.companyCountry, plan.employeeCountry);
    shareResult = null;
    notice = null;
  }
</script>

<svelte:head>
  <title>FlexyDay - Work their day off. Take yours.</title>
  <meta
    name="description"
    content="Compare two countries' public holidays on one twelve-month timeline. Work through a company holiday to earn a day off, then share the schedule with a read-only link."
  />
  <meta property="og:title" content="FlexyDay - Work their day off. Take yours." />
  <meta
    property="og:description"
    content="Two countries, one timeline. Work through a company holiday to earn a day off, then share the schedule with a read-only link."
  />
  <meta property="og:type" content="website" />
  <meta property="og:url" content={`${page.url.origin}${page.url.pathname}`} />
  <meta property="og:image" content={`${page.url.origin}/og.png`} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
</svelte:head>

<TopBar {statusText} />

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
          <Sparkles size={13} class="text-accent" />
          Cross-border holiday swaps
        </p>
        <h1 class="mt-4 text-5xl leading-[1.05] font-extrabold tracking-tight text-ink sm:text-6xl">
          {#each headlineWords as word, index (index)}
            <span class="headline-word" style="animation-delay: {index * 70}ms">{word}</span>
            {" "}
          {/each}
        </h1>
        <p class="mt-4 max-w-[52ch] text-[17px] leading-relaxed text-ink-muted">
          Two countries, one timeline. Work a company holiday to earn a day, then spend it on
          days you actually celebrate.
        </p>
        <div class="mt-6 flex flex-wrap items-center gap-3">
          <a
            href="#timeline"
            class="inline-flex items-center gap-2 rounded-2xl bg-ink px-5 py-3 text-[15px] font-bold text-paper shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop active:translate-y-0 active:scale-[0.98]"
          >
            <ArrowDown size={17} />
            Start planning
          </a>
          <ul class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm font-medium text-ink-muted">
            <li class="inline-flex items-center gap-1.5">
              <Check size={15} class="text-earn-dot" /> Pick two countries
            </li>
            <li class="inline-flex items-center gap-1.5">
              <Check size={15} class="text-earn-dot" /> Mark days to earn and spend
            </li>
            <li class="inline-flex items-center gap-1.5">
              <Check size={15} class="text-earn-dot" /> Share a link that expires in 30 days
            </li>
          </ul>
        </div>
      </div>

      <div class="rise rounded-3xl border border-line bg-panel p-6 shadow-pop" style="animation-delay: 150ms">
        <div class="grid gap-4 sm:grid-cols-2">
          <CountryPicker value={plan.companyCountry} label="Company country" onchange={onCompanyChange} />
          <CountryPicker value={plan.employeeCountry} label="Employee country" onchange={onEmployeeChange} />
        </div>

        <div class="mt-5 grid grid-cols-3 gap-3">
          <div class="rounded-2xl bg-company px-3 py-3 text-center">
            <p class="tabular text-2xl font-extrabold text-company-ink">{windowStats.company}</p>
            <p class="mt-0.5 text-[11px] leading-tight font-bold text-company-ink/80">
              {companyLabel} holidays in view
            </p>
          </div>
          <div class="rounded-2xl bg-local px-3 py-3 text-center">
            <p class="tabular text-2xl font-extrabold text-local-ink">{windowStats.local}</p>
            <p class="mt-0.5 text-[11px] leading-tight font-bold text-local-ink/80">
              {employeeLabel} holidays in view
            </p>
          </div>
          <div class="rounded-2xl bg-accent-soft px-3 py-3 text-center">
            <p class="tabular text-2xl font-extrabold text-accent">{windowStats.shared}</p>
            <p class="mt-0.5 text-[11px] leading-tight font-bold text-accent/80">On the same day</p>
          </div>
        </div>

        <p class="mt-4 text-[13px] leading-relaxed text-ink-muted">
          Counts follow the timeline below as you page through the months. Share links are read
          only and expire 30 days after creation.
        </p>
      </div>
    </div>
  </section>

  {#if sameCountry}
    <p class="mt-8 rounded-2xl bg-company px-4 py-3 text-sm font-medium text-company-ink">
      Pick two different countries to compare their holidays.
    </p>
  {/if}

  {#if notice}
    <p
      class="mt-8 rounded-2xl px-4 py-3 text-sm font-medium {notice.kind === 'error'
        ? 'bg-company text-company-ink'
        : 'bg-earn text-earn-ink'}"
    >
      {notice.message}
    </p>
  {/if}

  <section id="timeline" class="mt-12 scroll-mt-24">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 class="text-2xl font-extrabold tracking-tight text-ink">One timeline, twelve months</h2>
        <p class="mt-1 max-w-[62ch] text-[15px] leading-relaxed text-ink-muted">
          Every day both countries share, side by side in one grid. Select any day for details.
        </p>
      </div>
      <WindowPager
        label={windowLabel}
        canGoBack={!windowStartsAtEarliest}
        canReset={!windowStartsThisMonth}
        onprev={() => shiftWindow(-1)}
        onnext={() => shiftWindow(1)}
        onreset={resetWindow}
      />
    </div>

    <div class="mt-4"><Legend {companyLabel} localLabel={employeeLabel} /></div>

    {#if companyState.status === "loading" || employeeState.status === "loading"}
      <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each Array(12) as _, index (index)}
          <div class="shimmer h-56 rounded-2xl border border-line bg-panel"></div>
        {/each}
      </div>
    {:else if companyState.status === "error" || employeeState.status === "error"}
      <div class="mt-6 rounded-3xl border border-line bg-panel px-6 py-12 text-center">
        <p class="font-bold text-ink">The holiday list could not be loaded</p>
        <p class="mx-auto mt-1 max-w-md text-sm leading-relaxed text-ink-muted">
          {companyState.status === "error" ? companyState.message : employeeState.status === "error" ? employeeState.message : "Something went wrong"}
        </p>
        <button
          type="button"
          class="mt-4 inline-flex items-center gap-2 rounded-2xl bg-ink px-5 py-2.5 text-sm font-bold text-paper transition-all duration-200 hover:-translate-y-px hover:shadow-pop active:translate-y-0 active:scale-[0.98]"
          onclick={() => {
            void load(plan.companyCountry, "company");
            void load(plan.employeeCountry, "employee");
          }}
        >
          <RotateCcw size={15} />
          Try again
        </button>
      </div>
    {:else}
      <div class="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2">
          {#each windowMonths as entry (entry.year * 12 + entry.month)}
            <MonthCalendar
              year={entry.year}
              month={entry.month}
              companyHolidays={companyByDate}
              localHolidays={employeeByDate}
              workedDates={workedSet}
              takenDates={spentSet}
              {todayIso}
              interactive={!sameCountry}
              onselect={(date) => {
                drawerDate = date;
                drawerOpen = true;
              }}
            />
          {/each}
        </div>

        <aside class="flex min-w-0 flex-col gap-4 xl:sticky xl:top-24 xl:h-[calc(100dvh-6.5rem)]">
          <div class="shrink-0">
            <BalanceCard
              value={currentBalance}
              earned={plan.workedDates.length}
              spent={plan.takenDates.length}
              statement={balanceStatement}
            />
          </div>
          <section
            class="flex min-h-0 flex-col rounded-3xl border border-line bg-panel p-5 shadow-soft xl:flex-1"
          >
            <h3 class="flex shrink-0 items-center gap-2 text-[17px] font-extrabold tracking-tight text-ink">
              <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-earn text-earn-ink">
                <Briefcase size={17} />
              </span>
              Work through
            </h3>
            <div class="mt-3 flex min-h-0 flex-col xl:flex-1">
              <HolidayList
                action="worked"
                holidays={workedList}
                selectedDates={workedSet}
                showLabel={false}
                listClass="max-h-[22rem] min-h-0 overflow-y-auto xl:max-h-none xl:flex-1"
                ontoggle={toggleWorked}
              />
            </div>
          </section>

          <section
            class="flex min-h-0 flex-col rounded-3xl border border-line bg-panel p-5 shadow-soft xl:flex-1"
          >
            <h3 class="flex shrink-0 items-center gap-2 text-[17px] font-extrabold tracking-tight text-ink">
              <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-spend text-spend-ink">
                <CalendarCheck size={17} />
              </span>
              Days off
            </h3>
            <div class="mt-3 flex min-h-0 flex-col xl:flex-1">
              <HolidayList
                action="taken"
                holidays={takenList}
                selectedDates={spentSet}
                showLabel={false}
                listClass="max-h-[22rem] min-h-0 overflow-y-auto xl:max-h-none xl:flex-1"
                ontoggle={toggleTaken}
              />
            </div>
          </section>
        </aside>
      </div>
      <p class="mt-5 max-w-[70ch] text-[13px] leading-relaxed text-ink-muted">
        Company holidays can be worked through to earn a day. Local holidays, and any other
        day, can be taken off with an earned day or your own leave.
      </p>
    {/if}
  </section>

  <section class="mt-12">
    <h2 class="text-2xl font-extrabold tracking-tight text-ink">Summary</h2>
    <p class="mt-1 text-[15px] text-ink-muted">What you earned, what you spent, and the difference.</p>

    {#if !hasMarks}
      <div class="mt-4 rounded-3xl border border-dashed border-line-strong bg-panel px-6 py-14 text-center">
        <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-earn text-earn-ink">
          <CalendarPlus size={26} />
        </span>
        <p class="mt-4 font-bold text-ink">Nothing marked yet</p>
        <p class="mx-auto mt-1 max-w-md text-sm leading-relaxed text-ink-muted">
          Work through a {companyLabel} holiday to earn a day, then take any day off with it. If
          you take more than you earn, the difference comes out of your own leave.
        </p>
      </div>
    {:else}
      <div class="mt-4 grid gap-6 lg:grid-cols-2">
        <div class="rounded-3xl border border-earn-dot/40 bg-earn p-6">
          <h3 class="text-xs font-extrabold tracking-widest text-earn-ink uppercase">
            Earned, worked through ({plan.workedDates.length})
          </h3>
          <div class="mt-3">
            <MarkedList
              dates={workedRows}
              holidays={companyByDate}
              tone="worked"
              emptyText="None."
              onremove={removeFromPanel}
            />
          </div>
        </div>

        <div class="rounded-3xl border border-spend-dot/40 bg-spend p-6">
          <h3 class="text-xs font-extrabold tracking-widest text-spend-ink uppercase">
            Spent, days off ({plan.takenDates.length})
          </h3>
          <div class="mt-3">
            <MarkedList
              dates={takenRows}
              holidays={employeeByDate}
              tone="taken"
              emptyText="None."
              onremove={removeFromPanel}
            />
          </div>
        </div>
      </div>
    {/if}
  </section>

  <section class="mt-12">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 class="text-2xl font-extrabold tracking-tight text-ink">Share or export</h2>
        <p class="mt-1 max-w-[62ch] text-[15px] leading-relaxed text-ink-muted">
          Send a read only link that expires in 30 days, or keep the schedule as JSON and
          calendar files.
        </p>
      </div>
      <button
        type="button"
        disabled={!hasMarks}
        class="inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-ink-muted transition-colors duration-200 hover:bg-ink/5 hover:text-ink disabled:opacity-40"
        onclick={reset}
      >
        <RotateCcw size={15} />
        Clear plan
      </button>
    </div>

    <div class="mt-5 grid gap-4 lg:grid-cols-3">
      <div
        class="relative flex flex-col overflow-hidden rounded-3xl border border-accent/40 bg-accent-soft p-5"
      >
        <div
          class="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-accent/20 blur-2xl"
          aria-hidden="true"
        ></div>
        <span
          class="relative flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-ink"
        >
          <Link2 size={18} />
        </span>
        <h3 class="relative mt-3 text-[15px] font-extrabold tracking-tight text-ink">Share link</h3>
        <p class="relative mt-1 text-[13px] leading-relaxed text-ink-muted">
          A read only page for anyone holding the link. It expires 30 days after creation.
        </p>
        <button
          type="button"
          disabled={!hasMarks}
          class="relative mt-auto inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3 text-[15px] font-bold text-accent-ink shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop active:translate-y-0 active:scale-[0.98] disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-soft"
          onclick={share}
        >
          <Link2 size={16} />
          Create share link
        </button>
      </div>

      <div class="flex flex-col rounded-3xl border border-line bg-panel p-5 shadow-soft">
        <span
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-panel-soft text-ink-muted"
        >
          <Braces size={18} />
        </span>
        <h3 class="mt-3 text-[15px] font-extrabold tracking-tight text-ink">JSON file</h3>
        <p class="mt-1 text-[13px] leading-relaxed text-ink-muted">
          The full schedule, nothing dropped. Import it back to FlexyDay anytime.
        </p>
        <button
          type="button"
          disabled={!hasMarks}
          class="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-paper px-5 py-3 text-[15px] font-semibold text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-soft active:translate-y-0 active:scale-[0.98] disabled:opacity-40 disabled:hover:translate-y-0"
          onclick={downloadJson}
        >
          <Download size={16} />
          Download JSON
        </button>
      </div>

      <div class="flex flex-col rounded-3xl border border-line bg-panel p-5 shadow-soft">
        <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-earn text-earn-ink">
          <CalendarPlus size={18} />
        </span>
        <h3 class="mt-3 text-[15px] font-extrabold tracking-tight text-ink">Calendar file</h3>
        <p class="mt-1 text-[13px] leading-relaxed text-ink-muted">
          Drops the worked and taken days into Google Calendar or Outlook. One way only.
        </p>
        <button
          type="button"
          disabled={!hasMarks}
          class="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-paper px-5 py-3 text-[15px] font-semibold text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-soft active:translate-y-0 active:scale-[0.98] disabled:opacity-40 disabled:hover:translate-y-0"
          onclick={downloadIcs}
        >
          <Download size={16} />
          Download .ics
        </button>
      </div>
    </div>

    <label
      class="mt-4 flex cursor-pointer items-center gap-3.5 rounded-2xl border border-dashed border-line-strong bg-panel/60 px-5 py-4 transition-all duration-200 hover:border-accent hover:bg-accent-soft/40"
    >
      <span
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-panel-soft text-ink-muted"
      >
        <Upload size={18} />
      </span>
      <span class="min-w-0">
        <span class="block text-sm font-bold text-ink">Import JSON</span>
        <span class="block text-xs leading-relaxed text-ink-muted">
          Load a schedule from an exported file. It is validated before anything is applied.
        </span>
      </span>
      <input type="file" accept="application/json,.json" class="hidden" onchange={importJson} />
    </label>

    {#if shareResult}
      <div class="mt-4 rounded-3xl border border-earn-dot/40 bg-earn p-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="flex items-center gap-2 text-sm font-bold text-earn-ink">
            <Check size={16} />
            Link created, read only
          </p>
          <p
            class="rounded-full bg-earn-dot/15 px-3 py-1 text-[11px] font-bold tracking-wide text-earn-ink uppercase"
          >
            Expires {formatFullDate(shareResult.expiresAt.slice(0, 10), "en")}
          </p>
        </div>
        <div class="mt-3 flex items-center gap-2 rounded-2xl bg-paper px-3.5 py-2.5">
          <p class="tabular min-w-0 flex-1 truncate select-all text-sm text-ink">{shareResult.url}</p>
          <button
            type="button"
            class="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors duration-200 {copied
              ? 'bg-earn-dot text-paper'
              : 'bg-ink/5 text-ink hover:bg-ink/10'}"
            onclick={copyLink}
          >
            {#if copied}
              <Check size={14} />
              Copied
            {:else}
              <Copy size={14} />
              Copy
            {/if}
          </button>
        </div>
        <p class="mt-2.5 text-xs leading-relaxed text-earn-ink/80">
          Anyone with the link can read this schedule. To change it, edit here and create a new
          link; the old one stays until it expires.
        </p>
      </div>
    {/if}
  </section>

  <footer class="mt-10 text-center text-xs leading-relaxed text-ink-faint">
    Holiday data comes from public calendars and refreshes automatically. Share links expire 30
    days after creation.
  </footer>
</main>

<DayDrawer
  open={drawerOpen}
  date={drawerDate}
  companyHoliday={companyByDate.get(drawerDate)}
  localHoliday={employeeByDate.get(drawerDate)}
  companyHolidays={companyByDate}
  localHolidays={employeeByDate}
  isWorked={isWorkedDate(plan, drawerDate)}
  isTaken={isTakenDate(plan, drawerDate)}
  {companyLabel}
  {employeeLabel}
  onwork={() => toggleWorked(drawerDate)}
  ontake={() => toggleTaken(drawerDate)}
  onclose={() => (drawerOpen = false)}
/>

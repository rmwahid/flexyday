<script lang="ts">
  import { Building2, Check, ChevronDown, MapPin, Search } from "@lucide/svelte";
  import { COUNTRIES, type CountryOption } from "$lib/holidays/countries";

  interface Props {
    value: string;
    label: "Company country" | "Employee country";
    onchange: (token: string) => void;
  }

  let { value, label, onchange }: Props = $props();

  let open = $state(false);
  let query = $state("");
  let active = $state(0);
  let root = $state<HTMLElement | null>(null);

  const isCompany = $derived(label === "Company country");
  const fieldId = $derived(isCompany ? "company-country" : "employee-country");
  const current = $derived(COUNTRIES.find((country) => country.token === value));

  function filter(text: string): CountryOption[] {
    const needle = text.trim().toLowerCase();
    if (needle === "") return [...COUNTRIES];
    return COUNTRIES.filter((country) => country.label.toLowerCase().includes(needle));
  }

  const matches: CountryOption[] = $derived(filter(query));

  function show() {
    query = "";
    active = Math.max(0, filter("").findIndex((country) => country.token === value));
    open = true;
  }

  function hide() {
    open = false;
    query = "";
  }

  function choose(country: CountryOption) {
    onchange(country.token);
    hide();
  }

  function move(delta: number) {
    if (matches.length === 0) return;
    active = (active + delta + matches.length) % matches.length;
  }

  function onSearchInput(event: Event) {
    query = (event.currentTarget as HTMLInputElement).value;
    active = 0;
  }

  function onSearchKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Enter") {
      const country = matches[active];
      if (country) {
        event.preventDefault();
        choose(country);
      }
    } else if (event.key === "Escape" || event.key === "Tab") {
      hide();
    }
  }

  function onWindowPointerdown(event: PointerEvent) {
    if (open && root && !root.contains(event.target as Node)) hide();
  }

  /**
   * Keeps the highlighted option visible while arrowing through a long list. The
   * second parameter is what Svelte passes from `use:scrollActive={...}`; the action
   * re-runs each time the flag flips, so moving the highlight scrolls it into view.
   */
  function scrollActive(node: HTMLElement, _highlighted: boolean) {
    node.scrollIntoView({ block: "nearest" });
  }

  /** Puts the caret in the search field the moment the panel opens. */
  function focusSearch(node: HTMLInputElement) {
    node.focus();
  }
</script>

<svelte:window onpointerdown={onWindowPointerdown} />

<div class="block min-w-0">
  <span
    class="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-ink-muted uppercase"
  >
    {#if isCompany}
      <Building2 size={12} />
    {:else}
      <MapPin size={12} />
    {/if}
    {label}
  </span>

  <div class="relative" bind:this={root}>
    <button
      type="button"
      aria-label="{label}: {current?.label ?? value}"
      aria-haspopup="listbox"
      aria-expanded={open}
      onclick={open ? hide : show}
      class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-line bg-panel py-3 pr-4 pl-4 text-left text-[15px] font-semibold text-ink shadow-soft transition-all duration-200 outline-none hover:border-line-strong hover:shadow-pop focus:border-accent focus:ring-2 focus:ring-accent/30"
    >
      <span class="truncate">{current?.label ?? value}</span>
      <ChevronDown
        size={16}
        class="shrink-0 text-ink-muted transition-transform duration-200 {open ? 'rotate-180' : ''}"
      />
    </button>

    {#if open}
      <div
        class="absolute top-full left-0 z-30 mt-1.5 w-full min-w-56 rounded-xl border border-line bg-panel p-1.5 shadow-pop"
      >
        <span class="relative block">
          <Search
            size={15}
            class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint"
          />
          <input
            type="text"
            use:focusSearch
            placeholder="Search countries"
            value={query}
            oninput={onSearchInput}
            onkeydown={onSearchKeydown}
            role="combobox"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-label="Search {label}"
            aria-controls="{fieldId}-listbox"
            aria-activedescendant={matches[active]
              ? "{fieldId}-option-{active}"
              : undefined}
            class="w-full rounded-lg border border-line bg-paper py-2 pr-3 pl-9 text-sm text-ink transition-all duration-200 outline-none placeholder:text-ink-faint hover:border-line-strong focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </span>

        {#if matches.length === 0}
          <p class="px-3 py-2.5 text-sm text-ink-faint">No country matches that search.</p>
        {:else}
          <div
            id="{fieldId}-listbox"
            role="listbox"
            aria-label={label}
            class="mt-1.5 max-h-64 overflow-y-auto"
          >
            {#each matches as country, index (country.token)}
              <button
                type="button"
                id="{fieldId}-option-{index}"
                role="option"
                aria-selected={country.token === value}
                use:scrollActive={active === index}
                onclick={() => choose(country)}
                onmouseenter={() => (active = index)}
                class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors duration-150 {country.token ===
                value
                  ? 'bg-ink/5 text-ink'
                  : active === index
                    ? 'bg-panel-soft text-ink'
                    : 'text-ink-muted'}"
              >
                <span class="truncate">{country.label}</span>
                {#if country.token === value}
                  <Check size={14} class="shrink-0 text-accent" />
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
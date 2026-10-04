<script lang="ts">
  import { ArrowLeftRight, TrendingDown, TrendingUp } from "@lucide/svelte";

  interface Props {
    /** Earned minus spent. Positive means days still owed to the employee. */
    value: number;
    earned: number;
    spent: number;
    statement: string;
  }

  let { value, earned, spent, statement }: Props = $props();

  const tone = $derived(value > 0 ? "earn" : value < 0 ? "spend" : "even");
  const display = $derived(value > 0 ? `+${value}` : `${value}`);

  /** The gauge sweeps from -90deg (all spent) through 0 to +90deg (all earned). */
  const needleAngle = $derived.by(() => {
    const total = earned + spent;
    if (total === 0) return 0;
    const ratio = (earned - spent) / total;
    return Math.max(-90, Math.min(90, ratio * 90));
  });
</script>

<div
  class="relative overflow-hidden rounded-3xl border p-5 shadow-soft {tone === 'earn'
    ? 'border-earn-dot/30 bg-earn'
    : tone === 'spend'
      ? 'border-spend-dot/30 bg-spend'
      : 'border-line bg-panel'}"
>
  <div
    class="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full opacity-40 blur-3xl {tone ===
    'spend'
      ? 'bg-spend-dot/40'
      : 'bg-earn-dot/40'}"
    aria-hidden="true"
  ></div>

  <p
    class="relative flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase {tone ===
    'earn'
      ? 'text-earn-ink'
      : tone === 'spend'
        ? 'text-spend-ink'
        : 'text-ink-muted'}"
  >
    {#if value > 0}
      <TrendingUp size={14} />
    {:else if value < 0}
      <TrendingDown size={14} />
    {:else}
      <ArrowLeftRight size={14} />
    {/if}
    Balance
  </p>

  <div class="relative mt-2 flex items-center gap-4">
    <div class="relative hidden h-24 w-24 shrink-0 sm:block" aria-hidden="true">
      <svg viewBox="0 0 100 58" class="h-full w-full">
        <path
          d="M 8 52 A 44 44 0 0 1 92 52"
          fill="none"
          stroke="var(--line-strong)"
          stroke-width="9"
          stroke-linecap="round"
          opacity="0.45"
        />
        <path
          d="M 8 52 A 44 44 0 0 1 92 52"
          fill="none"
          stroke={tone === "spend" ? "var(--spend-dot)" : "var(--earn-dot)"}
          stroke-width="9"
          stroke-linecap="round"
          stroke-dasharray="140"
          stroke-dashoffset={tone === "even" ? 140 : tone === "earn" ? 52 : 52}
          opacity="0.9"
        />
        <g
          class="gauge-needle"
          style="transform-origin: 50px 52px; transform: rotate({needleAngle}deg)"
        >
          <line x1="50" y1="52" x2="50" y2="18" stroke="var(--ink)" stroke-width="3.5" stroke-linecap="round" />
          <circle cx="50" cy="52" r="5" fill="var(--ink)" />
        </g>
      </svg>
    </div>

    <div class="min-w-0">
      <p class="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span
          class="tabular text-5xl font-extrabold tracking-tight {tone === 'earn'
            ? 'text-earn-ink'
            : tone === 'spend'
              ? 'text-spend-ink'
              : 'text-ink'}"
        >
          {display}
        </span>
        <span
          class="tabular text-[13px] font-semibold {tone === 'even'
            ? 'text-ink-muted'
            : tone === 'earn'
              ? 'text-earn-ink/80'
              : 'text-spend-ink/80'}"
        >
          {earned} earned, {spent} spent
        </span>
      </p>
      <p
        class="mt-1 text-sm leading-relaxed {tone === 'even'
          ? 'text-ink-muted'
          : tone === 'earn'
            ? 'text-earn-ink'
            : 'text-spend-ink'}"
      >
        {statement}
      </p>
    </div>
  </div>
</div>

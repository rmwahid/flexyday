<script lang="ts">
  import { ChevronLeft, ChevronRight, RotateCcw } from "@lucide/svelte";

  interface Props {
    /** The twelve months currently in view, for example "Oct 2026 to Sep 2027". */
    label: string;
    /** False once the window sits on January, the earliest month planning allows. */
    canGoBack: boolean;
    canReset: boolean;
    onprev: () => void;
    onnext: () => void;
    onreset: () => void;
  }

  let { label, canGoBack, canReset, onprev, onnext, onreset }: Props = $props();
</script>

<div
  class="no-scrollbar flex w-full min-w-0 items-center gap-1.5 overflow-x-auto rounded-2xl border border-line bg-panel p-1.5 shadow-soft sm:w-auto"
>
  <button
    type="button"
    disabled={!canGoBack}
    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-muted transition-all duration-200 hover:bg-panel-soft hover:text-ink active:scale-90 disabled:opacity-30 disabled:hover:bg-transparent"
    aria-label="Show the previous month"
    onclick={onprev}
  >
    <ChevronLeft size={17} />
  </button>
  <p class="tabular min-w-0 flex-1 text-center text-sm font-bold tracking-tight text-ink sm:min-w-52">
    {label}
  </p>
  <button
    type="button"
    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-muted transition-all duration-200 hover:bg-panel-soft hover:text-ink active:scale-90"
    aria-label="Show the next month"
    onclick={onnext}
  >
    <ChevronRight size={17} />
  </button>
  <span class="h-5 w-px shrink-0 bg-line" aria-hidden="true"></span>
  <button
    type="button"
    disabled={!canReset}
    class="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[13px] font-bold text-ink-muted transition-all duration-200 hover:bg-panel-soft hover:text-ink active:scale-95 disabled:opacity-40"
    onclick={onreset}
  >
    <RotateCcw size={14} />
    Today
  </button>
</div>
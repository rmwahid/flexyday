<script lang="ts">
  interface Props {
    /** Shown next to the red swatch, for example "Hong Kong holiday". */
    companyLabel: string;
    /** Shown next to the blue swatch, for example "Indonesia holiday". */
    localLabel: string;
  }

  let { companyLabel, localLabel }: Props = $props();
</script>

<div class="flex flex-wrap items-center gap-2">
  <span
    class="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-ink"
  >
    <span class="h-2.5 w-2.5 rounded-full bg-company-dot"></span>
    {companyLabel}
  </span>
  <span
    class="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-ink"
  >
    <span class="h-2.5 w-2.5 rounded-full bg-local-dot"></span>
    {localLabel}
  </span>
  <span
    class="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-ink"
  >
    <span
      class="h-2.5 w-2.5 rounded-full"
      style="background: linear-gradient(135deg, var(--company-dot) 0 49.5%, var(--local-dot) 50.5% 100%)"
    ></span>
    Both
  </span>
  <span
    class="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-ink"
  >
    <span class="h-2.5 w-2.5 rounded-full bg-earn-dot"></span>
    Worked, earns
  </span>
  <span
    class="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-ink"
  >
    <span class="h-2.5 w-2.5 rounded-full bg-spend-dot"></span>
    Taken, spends
  </span>
</div>

<script lang="ts">
  import { ColorSwatch, ColorSwatchGroup } from "@urcolor/svelte";

  const colors = [
    "hsl(210, 80%, 50%)",
    "hsl(350, 90%, 60%)",
    "hsl(120, 60%, 45%)",
    "hsl(45, 100%, 55%)",
    "hsl(280, 70%, 55%)",
    "hsl(15, 85%, 55%)",
  ];

  let selected = $state<string[]>([colors[0]!]);
</script>

<div class="flex flex-col gap-4">
  <ColorSwatchGroup.Root
    bind:value={selected}
    type="single"
    class="flex items-center gap-2"
  >
    {#each colors as color (color)}
      <ColorSwatch
        value={color}
        pressed={selected.includes(color)}
        onPressedChange={() => (selected = [color])}
        class="
          flex size-10 cursor-pointer items-center justify-center rounded-lg
          outline-none
        "
      >
        <svg
          class="size-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition-opacity duration-150"
          class:opacity-100={selected.includes(color)}
          class:opacity-0={!selected.includes(color)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </ColorSwatch>
    {/each}
  </ColorSwatchGroup.Root>
  <p class="text-sm text-(--vp-c-text-2)">
    Selected: <code>{selected[0] ?? "none"}</code>
  </p>
</div>

<script lang="ts">
  import { ColorField, useColor } from "@urcolor/svelte";

  const colorState = useColor("hsl(210, 80%, 50%)", "hsl");
</script>

<div class="flex flex-1 flex-wrap gap-2">
  {#each colorState.channels as ch (ch.key)}
    <div class="flex min-w-[80px] flex-1 flex-col gap-1">
      <label
        for={`guide-field-${ch.key}`}
        class="text-xs font-semibold text-(--vp-c-text-2)"
      >{ch.label}</label>
      <ColorField.Root
        bind:value={() => colorState.color, colorState.setColor}
        colorSpace="hsl"
        channel={ch.key}
        class="
          flex items-center overflow-hidden rounded-md border
          border-(--vp-c-divider) bg-(--vp-c-bg)
        "
      >
        <ColorField.Decrement
          class="
            flex size-8 shrink-0 cursor-pointer items-center justify-center
            border-none bg-transparent text-lg leading-none text-(--vp-c-text-2)
            select-none
            hover:not-disabled:bg-(--vp-c-bg-soft)
            hover:not-disabled:text-(--vp-c-text-1)
            disabled:cursor-default disabled:opacity-30
          "
        >
          &minus;
        </ColorField.Decrement>
        <ColorField.Input
          id={`guide-field-${ch.key}`}
          class="
            w-0 min-w-0 flex-1 border-none bg-transparent px-0.5 py-1
            text-center font-mono text-[13px] text-(--vp-c-text-1) outline-none
          "
        />
        <ColorField.Increment
          class="
            flex size-8 shrink-0 cursor-pointer items-center justify-center
            border-none bg-transparent text-lg leading-none text-(--vp-c-text-2)
            select-none
            hover:not-disabled:bg-(--vp-c-bg-soft)
            hover:not-disabled:text-(--vp-c-text-1)
            disabled:cursor-default disabled:opacity-30
          "
        >
          +
        </ColorField.Increment>
      </ColorField.Root>
    </div>
  {/each}
</div>

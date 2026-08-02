<script lang="ts">
  import { ColorSlider, useColor } from "@urcolor/svelte";

  const colorState = useColor("hsl(210, 80%, 50%)");
</script>

<ColorSlider.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  channel="h"
  class="w-full"
>
  <ColorSlider.Track class="relative h-5 overflow-hidden rounded-xl">
    <ColorSlider.Gradient
      class="absolute inset-0 rounded-xl"
      colors={["red", "yellow", "lime", "cyan", "blue", "magenta", "red"]}
    />
    <ColorSlider.Thumb
      class="
        block size-5 rounded-full border-[2.5px] border-white bg-white
        shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
        focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
      "
      aria-label="Hue"
    />
  </ColorSlider.Track>
</ColorSlider.Root>

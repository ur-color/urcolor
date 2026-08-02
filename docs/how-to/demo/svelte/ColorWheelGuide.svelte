<script lang="ts">
  import { ColorWheel, useColor } from "@urcolor/svelte";

  const colorState = useColor("hsl(210, 80%, 50%)");
</script>

<ColorWheel.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  angleChannel="h"
  radiusChannel="s"
  class="relative block size-64 overflow-hidden rounded-full"
  style="container-type: inline-size"
>
  <ColorWheel.Gradient class="absolute inset-0 block" />
  <ColorWheel.Thumb
    class="
      size-4 rounded-full border-2 border-white
      shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
      focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
    "
    aria-label="Color"
  />
</ColorWheel.Root>

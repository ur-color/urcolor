<script lang="ts">
  import { ColorArea, useColor } from "@urcolor/svelte";

  const colorState = useColor("hsl(210, 80%, 50%)");
</script>

<ColorArea.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  xChannel="h"
  yChannel="s"
  class="
    relative block h-[200px] w-full cursor-crosshair touch-none overflow-clip
    rounded-lg
  "
>
  <ColorArea.Gradient class="absolute inset-0" />
  <ColorArea.Thumb
    class="
      absolute size-5
      rounded-full border-2 border-white
      shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
      focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
    "
  />
</ColorArea.Root>

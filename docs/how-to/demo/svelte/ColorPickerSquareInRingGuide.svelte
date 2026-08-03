<script lang="ts">
  import { ColorArea, ColorRing, useColor } from "@urcolor/svelte";

  const colorState = useColor("hsl(210, 80%, 50%)");
</script>

<div class="relative size-64">
  <ColorRing.Root
    bind:value={() => colorState.color, colorState.setColor}
    colorSpace="hsv"
    channel="h"
    innerRadius={0.84}
    class="absolute inset-0"
    style="container-type: inline-size"
  >
    <ColorRing.Track class="relative block size-full">
      <ColorRing.Gradient
        class="absolute inset-0 block"
        channelOverrides={{ s: 1, v: 1, alpha: 1 }}
      />
      <ColorRing.Thumb
        class="
          size-4 rounded-full border-2 border-white
          shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
          focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
        "
        aria-label="Hue"
      />
    </ColorRing.Track>
  </ColorRing.Root>

  <ColorArea.Root
    bind:value={() => colorState.color, colorState.setColor}
    colorSpace="hsv"
    xChannel="s"
    yChannel="v"
    yInverted={true}
    class="absolute inset-[20.3%] cursor-crosshair touch-none overflow-clip rounded-sm"
  >
    <ColorArea.Gradient class="absolute inset-0" />
    <ColorArea.Thumb
      class="
        absolute size-5 rounded-full border-2 border-white
        shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
        focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
      "
    />
  </ColorArea.Root>
</div>

<script setup lang="ts">
import {
  ColorAreaRoot,
  ColorAreaArea,
  ColorAreaGradient,
  ColorAreaThumb,
  useColor,
} from "@urcolor/vue";

const { color } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <ColorAreaRoot
    v-model="color"
    color-space="oklch"
    x-channel="c"
    y-channel="l"
    as="div"
    class="
      relative block h-[200px] w-full cursor-crosshair touch-none overflow-clip
      rounded-lg
    "
    aria-label="OKLCh color area"
  >
    <ColorAreaArea as="div" class="absolute inset-0">
      <ColorAreaGradient
        as="div"
        class="absolute inset-0"
      />
      <ColorAreaThumb
        as="div"
        class="
          absolute size-5 transform-(--reka-slider-area-thumb-transform)
          rounded-full border-2 border-white
          shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
        "
      />
    </ColorAreaArea>
  </ColorAreaRoot>
</template>

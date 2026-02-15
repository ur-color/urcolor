<script setup lang="ts">
import { shallowRef } from "vue";
import { Color } from "internationalized-color";
import {
  ColorAreaRoot,
  ColorAreaTrack,
  ColorAreaGradient,
  ColorAreaThumb,
  ColorAreaThumbX,
  ColorAreaThumbY,
} from "@urcolor/vue";

const color = shallowRef<Color>(Color.parse("hsl(210, 80%, 50%)")!);

function onColorUpdate(c: Color | undefined) {
  if (c) {
    color.value = c;
  }
}
</script>

<template>
  <ColorAreaRoot
      :model-value="color"
      color-space="oklch"
      channel-x="c"
      channel-y="l"
      as="div"
      class="block"
      aria-label="OKLCh color area"
      @update:model-value="onColorUpdate"
    >
      <ColorAreaTrack as="div" class="relative w-full h-[200px] rounded-lg overflow-clip cursor-crosshair touch-none">
        <ColorAreaGradient
          as="div"
          class="absolute inset-0"
        />
        <ColorAreaThumb as="div" class="absolute size-5 [transform:var(--reka-slider-area-thumb-transform)]">
          <ColorAreaThumbX as="div" class="absolute inset-0 size-5 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)] outline-none focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]" />
          <ColorAreaThumbY as="div" class="opacity-0 size-0 pointer-events-none" />
        </ColorAreaThumb>
      </ColorAreaTrack>
    </ColorAreaRoot>
</template>

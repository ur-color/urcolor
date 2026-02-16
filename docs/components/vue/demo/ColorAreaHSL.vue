<script setup lang="ts">
import { shallowRef } from "vue";
import { Color } from "internationalized-color";
import "internationalized-color/css";
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
    color-space="hsl"
    channel-x="h"
    channel-y="s"
    as="div"
    class="block"
    aria-label="HSL color area"
    @update:model-value="onColorUpdate"
  >
    <ColorAreaTrack
      as="div"
      class="
        relative h-[200px] w-full cursor-crosshair touch-none overflow-clip
        rounded-lg
      "
    >
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
      >
        <ColorAreaThumbX class="outline-none" />
        <ColorAreaThumbY class="outline-none" />
      </ColorAreaThumb>
    </ColorAreaTrack>
  </ColorAreaRoot>
</template>

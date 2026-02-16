<script setup lang="ts">
import { shallowRef } from "vue";
import "internationalized-color/css"; // Import CSS for internationalized color
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
</script>

<template>
  <ColorAreaRoot
    v-model="color"
    color-space="hsl"
    channel-x="h"
    channel-y="s"
    as="div"
    class="block"
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
          focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
        "
      >
        <ColorAreaThumbX class="outline-none" />
        <ColorAreaThumbY class="outline-none" />
      </ColorAreaThumb>
    </ColorAreaTrack>
  </ColorAreaRoot>
</template>

<script setup lang="ts">
import { shallowRef } from "vue";
import "internationalized-color/css";
import { Color } from "internationalized-color";
import {
  ColorRingRoot,
  ColorRingTrack,
  ColorRingGradient,
  ColorRingThumb,
  ColorTriangleRoot,
  ColorTriangleGradient,
  ColorTriangleThumb,
} from "@urcolor/vue";

const color = shallowRef<Color>(Color.parse("hsl(210, 80%, 50%)")!);
</script>

<template>
  <div class="relative size-64">
    <ColorRingRoot
      v-model="color"
      color-space="hsv"
      channel="h"
      :inner-radius="0.84"
      as="div"
      class="absolute inset-0"
      style="container-type: inline-size"
    >
      <ColorRingTrack
        as="div"
        class="relative block size-full"
      >
        <ColorRingGradient
          as="div"
          class="absolute inset-0 block"
          :channel-overrides="{ s: 1, v: 1, alpha: 1 }"
        />
        <ColorRingThumb
          class="
            size-4 rounded-full border-2 border-white
            shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
            focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
          "
          aria-label="Hue"
        />
      </ColorRingTrack>
    </ColorRingRoot>

    <ColorTriangleRoot
      v-model="color"
      color-space="hsv"
      channel-x="s"
      channel-y="v"
      as="div"
      orientation="horizontal"
      :rotation="90"
      inverted
      class="absolute inset-[8%]"
    >
      <ColorTriangleGradient
        as="div"
        class="absolute inset-0 block"
      />
      <ColorTriangleThumb
        class="
          size-4 rounded-full border-2 border-white
          shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
          focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
        "
        aria-label="Color"
      />
    </ColorTriangleRoot>
  </div>
</template>

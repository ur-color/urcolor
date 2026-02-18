<script setup lang="ts">
import { shallowRef } from "vue";
import "internationalized-color/css";
import { Color } from "internationalized-color";
import {
  ColorRingRoot,
  ColorRingTrack,
  ColorRingGradient,
  ColorRingThumb,
} from "@urcolor/vue";

const color = shallowRef<Color>(Color.parse("hsl(210, 80%, 50%)")!);
</script>

<template>
  <ColorRingRoot
    v-model="color"
    color-space="hsl"
    channel="h"
    :inner-radius="0.85"
    as="div"
    class="relative block size-64"
    style="container-type: inline-size"
  >
    <ColorRingTrack
      as="div"
      class="relative block size-full"
    >
      <ColorRingGradient
        as="div"
        class="absolute inset-0 block"
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
</template>

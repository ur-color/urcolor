<script setup lang="ts">
import { shallowRef } from "vue";
import { Color } from "internationalized-color";
import "internationalized-color/css";
import {
  ColorWheelRoot,
  ColorWheelGradient,
  ColorWheelThumb,
} from "@urcolor/vue";

const color = shallowRef<Color>(Color.parse("hsl(210, 80%, 50%)")!);

function onColorUpdate(c: Color | undefined) {
  if (c) {
    color.value = c;
  }
}
</script>

<template>
  <ColorWheelRoot
    :model-value="color"
    color-space="hsl"
    channel-angle="h"
    channel-radius="s"
    class="block relative size-64 rounded-full overflow-hidden"
    style="container-type: inline-size"
    @update:model-value="onColorUpdate"
  >
    <ColorWheelGradient class="block absolute inset-0" />
    <ColorWheelThumb
      class="
        size-4 rounded-full border-2 border-white
        shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
        focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
      "
    />
  </ColorWheelRoot>
</template>

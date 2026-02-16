<script setup lang="ts">
import { shallowRef } from "vue";
import { Color } from "internationalized-color";
import "internationalized-color/css";
import {
  ColorSliderRoot,
  ColorSliderTrack,
  ColorSliderGradient,
  ColorSliderThumb,
} from "@urcolor/vue";

const color = shallowRef<Color>(Color.parse("hsl(210, 80%, 50%)")!);

function onColorUpdate(c: Color | undefined) {
  if (c) {
    color.value = c;
  }
}
</script>

<template>
  <ColorSliderRoot
    :model-value="color"
    color-space="hsl"
    channel="h"
    as="div"
    class="w-full"
    @update:model-value="onColorUpdate"
  >
    <ColorSliderTrack
      as="div"
      class="relative h-5 overflow-hidden rounded-xl"
    >
      <ColorSliderGradient
        as="div"
        class="absolute inset-0 rounded-xl"
        :colors="['red', 'yellow', 'lime', 'cyan', 'blue', 'magenta', 'red']"
      />
      <ColorSliderThumb
        class="
          block size-5 rounded-full border-[2.5px] border-white bg-white
          shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
          focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
        "
        aria-label="Hue"
      />
    </ColorSliderTrack>
  </ColorSliderRoot>
</template>

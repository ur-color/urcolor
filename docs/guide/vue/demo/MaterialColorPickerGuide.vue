<script setup lang="ts">
import { computed } from "vue";
import "internationalized-color/css";
import { colorSpaces } from "@urcolor/core";
import { Label } from "reka-ui";
import {
  useColor,
  ColorAreaRoot,
  ColorAreaTrack,
  ColorAreaGradient,
  ColorAreaThumb,
  ColorAreaThumbX,
  ColorAreaThumbY,
  ColorSliderRoot,
  ColorSliderTrack,
  ColorSliderGradient,
  ColorSliderThumb,
  ColorSliderCheckerboard,
  ColorFieldRoot,
  ColorFieldInput,
  ColorFieldIncrement,
  ColorFieldDecrement,
} from "@urcolor/vue";

const { color } = useColor("hsl(210, 80%, 50%)");
const channels = computed(() => colorSpaces["hsl"]?.channels ?? []);
</script>

<template>
  <div class="flex w-full max-w-xs flex-col gap-3 rounded-xl border border-(--vp-c-divider) bg-(--vp-c-bg) p-3 shadow-sm">
    <ColorAreaRoot
      v-model="color"
      color-space="hsv"
      channel-x="s"
      channel-y="v"
      :inverted-y="true"
      as="div"
      class="block"
    >
      <ColorAreaTrack
        as="div"
        class="relative h-[180px] w-full cursor-crosshair touch-none overflow-clip rounded-lg"
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

    <ColorSliderRoot
      v-model="color"
      color-space="hsv"
      channel="h"
      as="div"
      class="w-full"
    >
      <ColorSliderTrack
        as="div"
        class="relative h-4 overflow-hidden rounded-full"
      >
        <ColorSliderGradient
          as="div"
          class="absolute inset-0 rounded-full"
          :colors="['red', 'yellow', 'lime', 'cyan', 'blue', 'magenta', 'red']"
        />
        <ColorSliderThumb
          class="
            block size-4 rounded-full border-2 border-white
            shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
            focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
          "
          aria-label="Hue"
        />
      </ColorSliderTrack>
    </ColorSliderRoot>

    <ColorSliderRoot
      v-model="color"
      color-space="hsv"
      channel="alpha"
      as="div"
      class="w-full"
    >
      <ColorSliderTrack
        as="div"
        class="relative h-4 overflow-hidden rounded-full"
      >
        <ColorSliderCheckerboard
          as="div"
          class="absolute inset-0 rounded-full"
        />
        <ColorSliderGradient
          as="div"
          class="absolute inset-0 rounded-full"
        />
        <ColorSliderThumb
          class="
            block size-4 rounded-full border-2 border-white
            shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
            focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
          "
          aria-label="Alpha"
        />
      </ColorSliderTrack>
    </ColorSliderRoot>

    <div class="flex flex-1 flex-wrap gap-2">
      <div
        v-for="ch in channels"
        :key="ch.key"
        class="flex min-w-[60px] flex-1 flex-col gap-1"
      >
        <Label
          :for="`material-field-${ch.key}`"
          class="text-xs font-semibold text-(--vp-c-text-2)"
        >{{ ch.label }}</Label>
        <ColorFieldRoot
          v-model="color"
          color-space="hsl"
          :channel="ch.key"
          class="
            flex items-center overflow-hidden rounded-md border
            border-(--vp-c-divider) bg-(--vp-c-bg)
          "
        >
          <ColorFieldDecrement
            class="
              flex size-7 shrink-0 cursor-pointer items-center justify-center
              border-none bg-transparent text-lg leading-none text-(--vp-c-text-2)
              select-none
              hover:not-disabled:bg-(--vp-c-bg-soft)
              hover:not-disabled:text-(--vp-c-text-1)
              disabled:cursor-default disabled:opacity-30
            "
          >
            &minus;
          </ColorFieldDecrement>
          <ColorFieldInput
            :id="`material-field-${ch.key}`"
            class="
              w-0 min-w-0 flex-1 border-none bg-transparent px-0.5 py-1
              text-center font-mono text-[13px] text-(--vp-c-text-1) outline-none
            "
          />
          <ColorFieldIncrement
            class="
              flex size-7 shrink-0 cursor-pointer items-center justify-center
              border-none bg-transparent text-lg leading-none text-(--vp-c-text-2)
              select-none
              hover:not-disabled:bg-(--vp-c-bg-soft)
              hover:not-disabled:text-(--vp-c-text-1)
              disabled:cursor-default disabled:opacity-30
            "
          >
            +
          </ColorFieldIncrement>
        </ColorFieldRoot>
      </div>
    </div>
  </div>
</template>

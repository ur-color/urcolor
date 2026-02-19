<script setup lang="ts">
import { computed } from "vue";
import "internationalized-color/css";
import { colorSpaces } from "@urcolor/core";
import { Label } from "reka-ui";
import {
  useColor,
  ColorFieldRoot,
  ColorFieldInput,
  ColorFieldIncrement,
  ColorFieldDecrement,
} from "@urcolor/vue";

const { color } = useColor("hsl(210, 80%, 50%)");
const channels = computed(() => colorSpaces["hsl"]?.channels ?? []);
</script>

<template>
  <div class="flex flex-1 flex-wrap gap-2">
    <div
      v-for="ch in channels"
      :key="ch.key"
      class="flex min-w-[80px] flex-1 flex-col gap-1"
    >
      <Label
        :for="`guide-field-${ch.key}`"
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
            flex size-8 shrink-0 cursor-pointer items-center justify-center
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
          :id="`guide-field-${ch.key}`"
          class="
            w-0 min-w-0 flex-1 border-none bg-transparent px-0.5 py-1
            text-center font-mono text-[13px] text-(--vp-c-text-1) outline-none
          "
        />
        <ColorFieldIncrement
          class="
            flex size-8 shrink-0 cursor-pointer items-center justify-center
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
</template>

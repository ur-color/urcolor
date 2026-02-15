<script setup lang="ts">
import { shallowRef, computed } from "vue";
import { Color } from "internationalized-color";
import { colorSpaces } from "@urcolor/core";
import { Label } from "reka-ui";
import {
  ColorFieldRoot,
  ColorFieldInput,
  ColorFieldIncrement,
  ColorFieldDecrement,
} from "@urcolor/vue";

const color = shallowRef(Color.parse("hsl(210, 80%, 50%)")!);
const channels = computed(() => colorSpaces["hsl"]?.channels ?? []);
</script>

<template>
  <div class="flex items-start gap-4">
    <div class="flex-1 flex gap-2 flex-wrap">
      <div v-for="ch in channels" :key="ch.key" class="flex flex-col gap-1 flex-1 min-w-[80px]">
        <Label :for="`field-${ch.key}`" class="text-xs font-semibold text-(color:--vp-c-text-2)">{{ ch.label }}</Label>
        <ColorFieldRoot
          v-model="color"
          color-space="hsl"
          :channel="ch.key"
          class="flex items-center border border-(--vp-c-divider) rounded-md overflow-hidden bg-(--vp-c-bg)"
        >
          <ColorFieldDecrement class="flex items-center justify-center size-8 border-none bg-transparent text-(color:--vp-c-text-2) cursor-pointer text-lg leading-none select-none shrink-0 border-r border-r-(--vp-c-divider) hover:not-disabled:bg-(--vp-c-bg-soft) hover:not-disabled:text-(color:--vp-c-text-1) disabled:opacity-30 disabled:cursor-default">&minus;</ColorFieldDecrement>
          <ColorFieldInput :id="`field-${ch.key}`" class="flex-1 min-w-0 w-0 px-0.5 py-1 border-none bg-transparent text-center text-[13px] font-mono text-(color:--vp-c-text-1) outline-none" />
          <ColorFieldIncrement class="flex items-center justify-center size-8 border-none bg-transparent text-(color:--vp-c-text-2) cursor-pointer text-lg leading-none select-none shrink-0 border-l border-l-(--vp-c-divider) hover:not-disabled:bg-(--vp-c-bg-soft) hover:not-disabled:text-(color:--vp-c-text-1) disabled:opacity-30 disabled:cursor-default">+</ColorFieldIncrement>
        </ColorFieldRoot>
      </div>
    </div>
  </div>
</template>

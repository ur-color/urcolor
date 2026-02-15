<script setup lang="ts">
import { shallowRef } from "vue";
import { Color } from "internationalized-color";
import {
  ColorFieldRoot,
  ColorFieldInput,
} from "@urcolor/vue";

const color = shallowRef(Color.parse("hsl(210, 80%, 50%)")!);
</script>

<template>
  <div class="flex items-center gap-3">
    <ColorFieldRoot
      v-model="color"
      color-space="hex"
      channel="hex"
      format="hex"
      class="flex items-center h-8 px-3 border border-(--vp-c-divider) rounded-md overflow-hidden bg-(--vp-c-bg)"
    >
      <ColorFieldInput class="flex-1 min-w-0 px-3 py-1.5 border-none bg-transparent text-[13px] font-mono text-(color:--vp-c-text-1) outline-none" />
    </ColorFieldRoot>
  </div>
</template>

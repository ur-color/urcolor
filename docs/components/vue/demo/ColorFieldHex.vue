<script setup lang="ts">
import { shallowRef } from "vue";
import { Color } from "internationalized-color";
import "internationalized-color/css";
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
      class="
        flex h-8 items-center overflow-hidden rounded-md border
        border-(--vp-c-divider) bg-(--vp-c-bg) px-3
      "
    >
      <ColorFieldInput
        class="
          min-w-0 flex-1 border-none bg-transparent px-3 py-1.5 font-mono
          text-[13px] text-(--vp-c-text-1) outline-none
        "
      />
    </ColorFieldRoot>
  </div>
</template>

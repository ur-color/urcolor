<script setup lang="ts">
import { ref } from "vue";
import "internationalized-color/css";
import { ColorSwatchGroupRoot, ColorSwatchGroupItem } from "@urcolor/vue";

const colors = [
  "hsl(210, 80%, 50%)",
  "hsl(350, 90%, 60%)",
  "hsl(120, 60%, 45%)",
  "hsl(45, 100%, 55%)",
  "hsl(280, 70%, 55%)",
  "hsl(15, 85%, 55%)",
];

const selected = ref<string[]>([colors[0]!]);
</script>

<template>
  <div class="flex flex-col gap-4">
    <ColorSwatchGroupRoot
      v-model="selected"
      type="single"
      class="flex items-center gap-2"
    >
      <ColorSwatchGroupItem
        v-for="color in colors"
        :key="color"
        :value="color"
        class="
          size-10 cursor-pointer rounded-lg outline-2 outline-offset-2
          outline-transparent transition-shadow
          focus:outline-none
          focus-visible:outline-(--vp-c-brand-2)
          data-[state=on]:outline-(--vp-c-brand-2)!
        "
      />
    </ColorSwatchGroupRoot>
    <p class="text-sm text-gray-500">
      Selected: <code>{{ selected[0] ?? 'none' }}</code>
    </p>
  </div>
</template>

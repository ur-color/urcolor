<script setup lang="ts">
import { ref } from "vue";
import "internationalized-color/css";
import { ColorSwatchGroupRoot, ColorSwatchGroupItem } from "@urcolor/vue";
import { Check } from "lucide-vue-next";

const colors = [
  "hsl(210, 80%, 50%)",
  "hsl(350, 90%, 60%)",
  "hsl(120, 60%, 45%)",
  "hsl(45, 100%, 55%)",
  "hsl(280, 70%, 55%)",
  "hsl(15, 85%, 55%)",
];

const selected = ref<string[]>([]);
</script>

<template>
  <div class="flex flex-col gap-4">
    <ColorSwatchGroupRoot
      v-model="selected"
      type="multiple"
      class="flex items-center gap-2"
    >
      <ColorSwatchGroupItem
        v-for="color in colors"
        :key="color"
        :value="color"
        class="
          flex size-10 cursor-pointer items-center justify-center rounded-lg
          outline-none
        "
      >
        <Check
          class="
            size-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]
            transition-opacity duration-150
          "
          :class="selected.includes(color) ? 'opacity-100' : 'opacity-0'"
        />
      </ColorSwatchGroupItem>
    </ColorSwatchGroupRoot>
    <p class="text-sm text-gray-500">
      Selected: <code>{{ selected.length ? selected.join(', ') : 'none' }}</code>
    </p>
  </div>
</template>

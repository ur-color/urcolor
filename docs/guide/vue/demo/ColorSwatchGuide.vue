<script setup lang="ts">
import { shallowRef } from "vue";
import "internationalized-color/css";
import { Color } from "internationalized-color";
import { ColorSwatchRoot } from "@urcolor/vue";
import { Check } from "lucide-vue-next";

const colors = [
  Color.parse("hsl(210, 80%, 50%)")!,
  Color.parse("hsl(350, 90%, 60%)")!,
  Color.parse("hsl(120, 60%, 45%)")!,
  Color.parse("hsla(45, 100%, 55%, 0.5)")!,
];

const selected = shallowRef(colors[0]);
</script>

<template>
  <div class="flex items-center gap-3">
    <ColorSwatchRoot
      v-for="(color, i) in colors"
      :key="i"
      :model-value="color"
      alpha
      class="
        size-10 cursor-pointer rounded-lg
        flex items-center justify-center
      "
      @click="selected = color"
    >
      <Check
        class="size-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition-opacity duration-150"
        :class="selected === color ? 'opacity-100' : 'opacity-0'"
      />
    </ColorSwatchRoot>
  </div>
</template>

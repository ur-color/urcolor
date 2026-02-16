<script setup lang="ts">
import { shallowRef } from "vue";
import "internationalized-color/css";
import { Color } from "internationalized-color";
import { ColorSwatchRoot } from "@urcolor/vue";

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
        size-10 cursor-pointer rounded-lg outline-2 outline-offset-2
        outline-transparent transition-[outline-color] duration-150
      "
      :class="{ 'outline-(--vp-c-brand-2)!': selected === color }"
      @click="selected = color"
    />
  </div>
</template>

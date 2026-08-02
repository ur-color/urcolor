<script setup lang="ts">
import type { ColorFormat } from "@urcolor/core";
import { computed } from "vue";
import { useHeroColor } from "../../composables/useHeroColor";

const color = useHeroColor();

const FORMATS: ColorFormat[] = ["oklch", "lch", "hsl", "display-p3"];

const lines = computed(() => FORMATS.map(f => color.value.toString(f)));
</script>

<template>
  <div
    class="sat-formats"
    aria-hidden="true"
  >
    <code
      v-for="(line, i) in lines"
      :key="i"
      class="sat-format-line"
    >{{ line }}</code>
  </div>
</template>

<style scoped>
.sat-formats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: clamp(120px, 26cqw, 200px);
}

.sat-format-line {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
  background: none;
  padding: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

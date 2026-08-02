<script setup lang="ts">
import type { Color } from "@urcolor/core";
import { setHeroColor, useHeroColor } from "../../composables/useHeroColor";
import SatFormats from "./SatFormats.vue";
import {
  ColorFieldInput,
  ColorFieldRoot,
} from "../../../../packages/vue/src/components/ColorField";

withDefaults(defineProps<{ withFormats?: boolean }>(), { withFormats: false });

const color = useHeroColor();

function onUpdate(next: Color | undefined) {
  setHeroColor(color, next);
}
</script>

<template>
  <div class="sat-hex">
    <ColorFieldRoot
      :model-value="color"
      color-space="hsv"
      format="hex"
      as="div"
      @update:model-value="onUpdate"
    >
      <ColorFieldInput
        as="input"
        class="sat-hex-input"
        aria-label="Hex color"
      />
    </ColorFieldRoot>
    <SatFormats v-if="withFormats" />
  </div>
</template>

<style scoped>
.sat-hex {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: clamp(96px, 22cqw, 150px);
}

.sat-hex-input {
  width: 100%;
  padding: 8px 10px;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  letter-spacing: 0.04em;
  text-align: center;
  text-transform: uppercase;
  color: var(--vp-c-text-1);
  background: color-mix(in srgb, var(--vp-c-bg-soft) 70%, transparent);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s ease;
}

.sat-hex-input:focus {
  border-color: var(--vp-c-brand-1);
}
</style>

<script setup lang="ts">
import type { Color } from "@urcolor/core";
import { setHeroColor, useHeroColor } from "../../composables/useHeroColor";
import {
  ColorFieldInput,
  ColorFieldRoot,
} from "../../../../packages/vue/src/components/ColorField";

const color = useHeroColor();

const CHANNELS = [
  { channel: "h", label: "H", aria: "Hue" },
  { channel: "s", label: "S", aria: "Saturation" },
  { channel: "v", label: "V", aria: "Value" },
  { channel: "alpha", label: "A", aria: "Alpha" },
] as const;

function onUpdate(next: Color | undefined) {
  setHeroColor(color, next);
}
</script>

<template>
  <div class="sat-fields">
    <ColorFieldRoot
      v-for="c in CHANNELS"
      :key="c.channel"
      :model-value="color"
      color-space="hsv"
      :channel="c.channel"
      as="div"
      class="sat-field"
      @update:model-value="onUpdate"
    >
      <label class="sat-field-label">{{ c.label }}</label>
      <ColorFieldInput
        as="input"
        class="sat-field-input"
        :aria-label="c.aria"
      />
    </ColorFieldRoot>
  </div>
</template>

<style scoped>
.sat-fields {
  display: flex;
  gap: 6px;
}

.sat-field {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: clamp(56px, 10cqw, 80px);
}

.sat-field-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sat-field-input {
  width: 100%;
  padding: 4px 6px;
  font-size: 12px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-1);
  background: color-mix(in srgb, var(--vp-c-bg-soft) 70%, transparent);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  text-align: center;
  outline: none;
  transition: border-color 0.2s ease;
}

.sat-field-input:focus {
  border-color: var(--vp-c-brand-1);
}
</style>

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
      class="sat-hex-field"
      @update:model-value="onUpdate"
    >
      <!-- "HEX" is the format's own token, the same in every locale the site
           ships, so it is not routed through the string table. -->
      <label class="sat-hex-label">Hex</label>
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

.sat-hex-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Matches `.sat-field-label` and `.hero-panel-label`, so the readouts all
   caption themselves the same way. */
.sat-hex-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.08em;
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

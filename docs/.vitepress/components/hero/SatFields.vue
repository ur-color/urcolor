<script setup lang="ts">
import type { Color } from "@urcolor/core";
import { computed } from "vue";
import { useDocsLang } from "../../composables/useDocsLang";
import { setHeroColor, useHeroColor } from "../../composables/useHeroColor";
import {
  ColorFieldInput,
  ColorFieldRoot,
} from "../../../../packages/vue/src/components/ColorField";
// Deep import rather than the package root: `@urcolor/i18n`'s index also
// registers the colour-name sources, and pulling those into the hero's first
// chunk is exactly what SatName's lazy `import()` exists to avoid. Channel
// labels are a static table with no data chunks behind them.
import { ChannelNames, type ChannelKey } from "../../../../packages/i18n/src/channel-names";

const color = useHeroColor();
const lang = useDocsLang();

const CHANNELS: readonly { channel: string; key: ChannelKey }[] = [
  { channel: "h", key: "hue" },
  { channel: "s", key: "saturation" },
  { channel: "v", key: "value" },
  { channel: "alpha", key: "alpha" },
];

/**
 * `ChannelNames` negotiates down to English for a locale it has no table for,
 * so the fallback here only covers an unknown *channel* — which the literal
 * list above rules out. It is kept so the template never renders `undefined`.
 */
const fields = computed(() => {
  const names = new ChannelNames(lang.value);
  return CHANNELS.map(c => ({ ...c, label: names.of(c.key) ?? c.key }));
});

function onUpdate(next: Color | undefined) {
  setHeroColor(color, next);
}
</script>

<template>
  <div class="sat-fields">
    <ColorFieldRoot
      v-for="c in fields"
      :key="c.channel"
      :model-value="color"
      color-space="hsv"
      :channel="c.channel"
      as="div"
      class="sat-field"
      @update:model-value="onUpdate"
    >
      <label
        class="sat-field-label"
        :title="c.label"
        :lang="lang"
      >{{ c.label }}</label>
      <ColorFieldInput
        as="input"
        class="sat-field-input"
        :aria-label="c.label"
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

/*
 * A whole translated word now, not a one-letter initial, so it has to be able
 * to give up: the longest of them ("Насыщенность") is wider than the field on a
 * narrow stage. The `title` on the element carries the untruncated text.
 */
.sat-field-label {
  max-width: 100%;
  font-size: 10px;
  font-weight: 600;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

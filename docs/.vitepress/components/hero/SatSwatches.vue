<script setup lang="ts">
import { computed } from "vue";
import { Color } from "@urcolor/core";
import { hueRamp } from "../../composables/heroLayout";
import { useHeroColor } from "../../composables/useHeroColor";
import { ColorSwatchRoot } from "../../../../packages/vue/src/components/ColorSwatch";
import {
  ColorSwatchPickerItem,
  ColorSwatchPickerItemIndicator,
  ColorSwatchPickerItemSwatch,
  ColorSwatchPickerRoot,
} from "../../../../packages/vue/src/components/ColorSwatchPicker";

const color = useHeroColor();

const ramp = computed(() => hueRamp(color.value.to("hsv").get("h") as number));

/**
 * The picker models its value as a CSS string, while the hero models a Color.
 * `selected` stays undefined unless the hero color happens to equal a ramp
 * entry, so the indicator only shows on a real match.
 */
const selected = computed(() => {
  const hex = color.value.toString("hex").toLowerCase();
  return ramp.value.find(c => Color.parse(c)?.toString("hex").toLowerCase() === hex);
});

// The picker's `update:modelValue` is reka's `ListboxRootEmits`, whose payload
// is `AcceptableValue` — widen to `unknown` and narrow here.
function onSelect(value: unknown) {
  if (typeof value !== "string") return;
  const next = Color.parse(value);
  if (next) color.value = next;
}
</script>

<template>
  <div class="sat-swatches">
    <!--
      The ramp only ever shows *derived* colors, so the picked one had nowhere
      to be seen at full size. `alpha` is on so the checkerboard shows through
      when the alpha field or slider is pulled down.
    -->
    <ColorSwatchRoot
      :model-value="color"
      alpha
      as="div"
      class="sat-swatch-current"
    />

    <ColorSwatchPickerRoot
      :model-value="selected"
      as="div"
      orientation="vertical"
      class="sat-swatch-grid"
      @update:model-value="onSelect"
    >
      <ColorSwatchPickerItem
        v-for="(c, i) in ramp"
        :key="c"
        :value="c"
        :data-swatch-index="i"
        as="div"
        class="sat-swatch"
      >
        <ColorSwatchPickerItemSwatch
          as="div"
          class="size-full rounded-md"
        />
        <ColorSwatchPickerItemIndicator
          as="span"
          class="sat-swatch-dot"
        />
      </ColorSwatchPickerItem>
    </ColorSwatchPickerRoot>
  </div>
</template>

<style scoped>
.sat-swatches {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: clamp(72px, 17cqw, 110px);
}

/*
 * Full width and square, so the picked color reads as one big chip above the
 * ramp rather than a letterboxed strip. The inset ring keeps a pale swatch from
 * dissolving into the panel fill.
 */
.sat-swatch-current {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 6px;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--vp-c-text-1) 12%, transparent);
}

/*
 * `:deep` because the grid has to sit on the picker's own root element, and
 * that element never receives this component's scoped-style attribute:
 * ColorSwatchPickerRoot renders through reka's ListboxRoot, which does not
 * forward the scope id the way a single-root primitive does. A plain
 * `.sat-swatch-grid` rule compiles to `.sat-swatch-grid[data-v-…]` and silently
 * matches nothing, which is what collapsed this dock to zero width.
 */
.sat-swatches :deep(.sat-swatch-grid) {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.sat-swatch {
  position: relative;
  aspect-ratio: 1;
  cursor: pointer;
  border-radius: 6px;
  outline: none;
}

.sat-swatch[data-highlighted] {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.sat-swatch-dot {
  position: absolute;
  inset: 0;
  border-radius: 6px;
  box-shadow: inset 0 0 0 2px white, inset 0 0 0 3px rgba(0, 0, 0, 0.25);
}
</style>

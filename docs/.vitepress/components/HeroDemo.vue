<script setup lang="ts">
import { shallowRef, computed, watch } from "vue";
import { usePreferredLanguages, useCssVar } from "@vueuse/core";
import { useBrandHue } from "../composables/useBrandHue";
import { Color, nameColor, useLocale } from "internationalized-color";
import * as allLocales from "internationalized-color/locales";
import {
  ColorAreaRoot,
  ColorAreaTrack,
  ColorAreaGradient,
  ColorAreaThumb,
  ColorAreaThumbX,
  ColorAreaThumbY,
} from "../../../packages/vue/src/components/ColorArea";
import {
  ColorSliderRoot,
  ColorSliderTrack,
  ColorSliderGradient,
  ColorSliderThumb,
} from "../../../packages/vue/src/components/ColorSlider";
import {
  ColorFieldRoot,
  ColorFieldInput,
} from "../../../packages/vue/src/components/ColorField";
import { ColorSwatchRoot } from "../../../packages/vue/src/components/ColorSwatch";

// Register all locales
Object.values(allLocales).forEach(useLocale);

// Detect browser locale
const browserLanguages = usePreferredLanguages();
const browserLocale = computed(() => {
  for (const lang of browserLanguages.value) {
    const code = lang?.split("-")[0]?.toLowerCase();
    if (code) return code;
  }
  return "en";
});
const colorName = computed(() => nameColor(color.value, browserLocale.value)?.name ?? "unknown");

const color = shallowRef<Color>(Color.create("hsv", { h: 328, s: 1, v: 1 }));

function onColorUpdate(c: Color | undefined) {
  if (c) {
    color.value = c;
  }
}

function onFieldUpdate(c: Color | undefined) {
  if (c) {
    color.value = c;
  }
}

const brandHue = useBrandHue();
const brand1 = useCssVar("--vp-c-brand-1");
const brand2 = useCssVar("--vp-c-brand-2");
const brand3 = useCssVar("--vp-c-brand-3");
const brandSoft = useCssVar("--vp-c-brand-soft");
const heroNameBg = useCssVar("--vp-home-hero-name-background");

watch(color, (c) => {
  const h = c.get("h") as number;
  brandHue.value = h;
  brand1.value = `hsl(${h}, 100%, 69%)`;
  brand2.value = `hsl(${h}, 100%, 63%)`;
  brand3.value = `hsl(${h}, 82%, 52%)`;
  brandSoft.value = `hsla(${h}, 100%, 63%, 0.14)`;
  heroNameBg.value = `linear-gradient(135deg, hsl(${h}, 100%, 63%), hsl(${h}, 82%, 52%))`;
}, { immediate: true });

</script>

<template>
  <div class="hero-demo">
    <div class="hero-demo-grid">
      <!-- Cell 1: ColorArea -->
      <div class="hero-cell-area">
        <ColorAreaRoot
          :model-value="color"
          color-space="hsv"
          channel-x="s"
          channel-y="v"
          as="div"
          class="block"
          inverted-y
          aria-label="Color picker"
          @update:model-value="onColorUpdate"
        >
          <ColorAreaTrack
            as="div"
            class="hero-area-track"
          >
            <ColorAreaGradient
              as="div"
              class="absolute inset-0"
            />
            <ColorAreaThumb
              as="div"
              class="
                absolute size-5 transform-(--reka-slider-area-thumb-transform)
                rounded-full border-[2.5px] border-white
                shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_2px_8px_rgba(0,0,0,0.3)]
                outline-none
                focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_0_0_3px_rgba(255,64,129,0.5)]
              "
            >
              <ColorAreaThumbX
                as="div"
                class="outline-none"
              />
              <ColorAreaThumbY
                as="div"
                class="outline-none"
              />
            </ColorAreaThumb>
          </ColorAreaTrack>
        </ColorAreaRoot>
      </div>

      <!-- Cell 2: Color Swatches -->
      <div class="hero-cell-swatches">
        <div class="hero-demo-swatch-block">
          <ColorSwatchRoot
            :model-value="color"
            class="hero-demo-swatch"
          />
          <ColorSwatchRoot
            :model-value="color"
            alpha
            class="hero-demo-swatch"
          />
        </div>
      </div>

      <!-- Cell 3: Sliders -->
      <div class="hero-cell-sliders">
        <ColorSliderRoot
          :model-value="color"
          color-space="hsv"
          channel="h"
          class="w-full"
          as="div"
          @update:model-value="onColorUpdate"
        >
          <ColorSliderTrack
            as="div"
            class="hero-slider-track"
          >
            <ColorSliderGradient
              as="div"
              class="absolute inset-0 rounded-lg"
              :channel-overrides="{ s: 1, v: 1, alpha: 1 }"
            />
            <ColorSliderThumb
              class="
                block size-5 rounded-full border-[2.5px] border-white bg-white
                shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_2px_6px_rgba(0,0,0,0.25)]
                focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_0_0_3px_rgba(255,64,129,0.5)]
              "
              aria-label="Hue"
            />
          </ColorSliderTrack>
        </ColorSliderRoot>

        <ColorSliderRoot
          :model-value="color"
          color-space="hsv"
          channel="s"
          class="w-full"
          as="div"
          @update:model-value="onColorUpdate"
        >
          <ColorSliderTrack
            as="div"
            class="hero-slider-track"
          >
            <ColorSliderGradient
              as="div"
              class="absolute inset-0 rounded-lg"
              :channel-overrides="{ alpha: 1 }"
            />
            <ColorSliderThumb
              class="
                block size-5 rounded-full border-[2.5px] border-white bg-white
                shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_2px_6px_rgba(0,0,0,0.25)]
                focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_0_0_3px_rgba(255,64,129,0.5)]
              "
              aria-label="Saturation"
            />
          </ColorSliderTrack>
        </ColorSliderRoot>

        <ColorSliderRoot
          :model-value="color"
          color-space="hsv"
          channel="v"
          class="w-full"
          as="div"
          @update:model-value="onColorUpdate"
        >
          <ColorSliderTrack
            as="div"
            class="hero-slider-track"
          >
            <ColorSliderGradient
              as="div"
              class="absolute inset-0 rounded-lg"
              :channel-overrides="{ alpha: 1 }"
            />
            <ColorSliderThumb
              class="
                block size-5 rounded-full border-[2.5px] border-white bg-white
                shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_2px_6px_rgba(0,0,0,0.25)]
                focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_0_0_3px_rgba(255,64,129,0.5)]
              "
              aria-label="Value"
            />
          </ColorSliderTrack>
        </ColorSliderRoot>

        <ColorSliderRoot
          :model-value="color"
          color-space="hsv"
          channel="alpha"
          class="w-full"
          as="div"
          @update:model-value="onColorUpdate"
        >
          <ColorSliderTrack
            as="div"
            class="hero-slider-track hero-alpha-track"
          >
            <ColorSliderGradient
              as="div"
              class="absolute inset-0 rounded-lg"
              :channel-overrides="false"
            />
            <ColorSliderThumb
              class="
                block size-5 rounded-full border-[2.5px] border-white bg-white
                shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_2px_6px_rgba(0,0,0,0.25)]
                focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_0_0_3px_rgba(255,64,129,0.5)]
              "
              aria-label="Alpha"
            />
          </ColorSliderTrack>
        </ColorSliderRoot>
      </div>

      <!-- Cell 4: Hex Field & Channel Fields -->
      <div class="hero-cell-fields">
        <div class="hero-field-name">
          {{ colorName }}
        </div>
        <ColorFieldRoot
          :model-value="color"
          color-space="hsv"
          format="hex"
          as="div"
          class="hero-field-hex"
          @update:model-value="onFieldUpdate"
        >
          <ColorFieldInput
            as="input"
            class="hero-field-input hero-field-input-hex"
            aria-label="Hex color"
          />
        </ColorFieldRoot>

        <div class="hero-field-row">
          <ColorFieldRoot
            :model-value="color"
            color-space="hsv"
            channel="h"
            as="div"
            class="hero-field"
            @update:model-value="onFieldUpdate"
          >
            <label class="hero-field-label">H</label>
            <ColorFieldInput
              as="input"
              class="hero-field-input"
              aria-label="Hue"
            />
          </ColorFieldRoot>
          <ColorFieldRoot
            :model-value="color"
            color-space="hsv"
            channel="s"
            as="div"
            class="hero-field"
            @update:model-value="onFieldUpdate"
          >
            <label class="hero-field-label">S</label>
            <ColorFieldInput
              as="input"
              class="hero-field-input"
              aria-label="Saturation"
            />
          </ColorFieldRoot>
          <ColorFieldRoot
            :model-value="color"
            color-space="hsv"
            channel="v"
            as="div"
            class="hero-field"
            @update:model-value="onFieldUpdate"
          >
            <label class="hero-field-label">V</label>
            <ColorFieldInput
              as="input"
              class="hero-field-input"
              aria-label="Value"
            />
          </ColorFieldRoot>
          <ColorFieldRoot
            :model-value="color"
            color-space="hsv"
            channel="alpha"
            as="div"
            class="hero-field"
            @update:model-value="onFieldUpdate"
          >
            <label class="hero-field-label">A</label>
            <ColorFieldInput
              as="input"
              class="hero-field-input"
              aria-label="Alpha"
            />
          </ColorFieldRoot>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero-demo {
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
}

.hero-demo-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  gap: 16px;
  padding: 20px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--vp-c-bg) 40%, transparent);
  backdrop-filter: blur(20px);
  border: 1px solid color-mix(in srgb, var(--vp-c-text-1) 15%, transparent);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
}

.dark .hero-demo-grid {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2);
}

.hero-cell-area {
  grid-column: 1;
  grid-row: 1;
  min-width: 0;
}

.hero-cell-swatches {
  grid-column: 2;
  grid-row: 1;
  align-self: stretch;
}

.hero-cell-sliders {
  grid-column: 1;
  grid-row: 2;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.hero-cell-fields {
  grid-column: 2;
  grid-row: 2;
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  gap: 0;
  width: 192px;
}

.hero-area-track {
  position: relative;
  width: 100%;
  height: 260px;
  border-radius: 12px;
  overflow: clip;
  cursor: crosshair;
  touch-action: none;
}

.hero-slider-track {
  position: relative;
  height: 1.25rem;
  border-radius: 0.75rem;
  overflow: hidden;
}

.hero-alpha-track {
  background: repeating-conic-gradient(rgb(230, 230, 230) 0% 25%, white 0% 50%) 0% 50% / 16px 16px;
}

.hero-demo-swatch-block {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
}

.hero-demo-swatch {
  flex: 1;
  width: 100%;
}

.hero-field-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  text-transform: capitalize;
  letter-spacing: 0.05em;
}

.hero-field-hex {
  width: 100%;
}

.hero-field-input {
  width: 100%;
  padding: 4px 6px;
  font-size: 12px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  text-align: center;
  outline: none;
  transition: border-color 0.2s ease;
}

.hero-field-input:focus {
  border-color: var(--vp-c-brand-1);
}

.hero-field-input-hex {
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.02em;
}

.hero-field-row {
  display: flex;
  gap: 4px;
}

.hero-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.hero-field-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

@media (max-width: 640px) {
  .hero-demo {
    max-width: 100%;
  }

  .hero-demo-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto auto;
  }

  .hero-cell-area,
  .hero-cell-swatches,
  .hero-cell-sliders,
  .hero-cell-fields {
    grid-column: 1;
    width: 100%;
  }

  .hero-cell-area { grid-row: 1; }
  .hero-cell-swatches { grid-row: 2; }
  .hero-cell-sliders { grid-row: 3; }
  .hero-cell-fields { grid-row: 4; }

  .hero-area-track {
    height: 160px;
  }

  .hero-demo-swatch-block {
    flex-direction: row;
    height: 60px;
  }
}
</style>

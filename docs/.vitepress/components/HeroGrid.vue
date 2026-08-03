<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { type LayoutMode, layoutModeForWidth, panelsForMode } from "../composables/heroLayout";
import { useBrandHue } from "../composables/useBrandHue";
import { useHeroColor } from "../composables/useHeroColor";
import HeroInstrument from "./HeroInstrument.vue";
import HeroPanel from "./HeroPanel.vue";
import SatFields from "./hero/SatFields.vue";
import SatFormats from "./hero/SatFormats.vue";
import SatHex from "./hero/SatHex.vue";
import SatName from "./hero/SatName.vue";
import SatSliders from "./hero/SatSliders.vue";
import SatSwatches from "./hero/SatSwatches.vue";

const color = useHeroColor();
const brandHue = useBrandHue();

const stageEl = ref<HTMLElement>();
const mode = ref<LayoutMode>("grid");

const panels = computed(() => panelsForMode(mode.value));

/* ---------- brand hue sync ---------- */

function applyBrandHue(h: number) {
  const el = document.documentElement;
  el.style.setProperty("--vp-c-brand-1", `hsl(${h}, 100%, 69%)`);
  el.style.setProperty("--vp-c-brand-2", `hsl(${h}, 100%, 63%)`);
  el.style.setProperty("--vp-c-brand-3", `hsl(${h}, 82%, 52%)`);
  el.style.setProperty("--vp-c-brand-soft", `hsla(${h}, 100%, 63%, 0.14)`);
  el.style.setProperty(
    "--vp-home-hero-name-background",
    `linear-gradient(135deg, hsl(${h}, 100%, 63%), hsl(${h}, 82%, 52%))`,
  );
}

watch(color, (c) => {
  const h = c.to("hsv").get("h") as number;
  brandHue.value = h;
  if (typeof document !== "undefined") applyBrandHue(h);
}, { immediate: true });

/* ---------- responsive mode ---------- */

let ro: ResizeObserver | undefined;

function syncMode() {
  const w = stageEl.value?.clientWidth ?? window.innerWidth;
  mode.value = layoutModeForWidth(w);
}

onMounted(() => {
  syncMode();
  if (typeof ResizeObserver !== "undefined" && stageEl.value) {
    ro = new ResizeObserver(syncMode);
    ro.observe(stageEl.value);
  }
});

onUnmounted(() => {
  ro?.disconnect();
});
</script>

<template>
  <div
    ref="stageEl"
    class="hero-grid"
    :data-mode="mode"
  >
    <HeroPanel
      id="instrument"
      :index="0"
      plain
    >
      <HeroInstrument />
    </HeroPanel>

    <HeroPanel
      v-for="(panel, i) in panels"
      :id="panel"
      :key="panel"
      :index="i + 1"
    >
      <SatHex
        v-if="panel === 'hex'"
        :with-formats="mode === 'compact'"
      />
      <SatName v-else-if="panel === 'name'" />
      <SatFormats v-else-if="panel === 'formats'" />
      <SatSwatches v-else-if="panel === 'swatches'" />
      <SatSliders v-else-if="panel === 'sliders'" />
      <SatFields v-else-if="panel === 'fields'" />
    </HeroPanel>
  </div>
</template>

<style scoped>
.hero-grid {
  display: grid;
  gap: 12px;
  width: 100%;
  container-type: inline-size;
}

/*
 * Placement lives here rather than on the panels: each panel sets only its own
 * `grid-area` name, and the mode decides where that name lands. The instrument
 * and the swatch ramp are the two tall cells, so they span the rows that the
 * stacked readouts on their right fill up.
 */
.hero-grid[data-mode="grid"] {
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1.2fr) minmax(0, 0.8fr);
  grid-template-areas:
    "instrument hex     swatches"
    "instrument sliders swatches"
    "instrument name    swatches"
    "fields     fields  fields"
    "formats    formats formats";
}

.hero-grid[data-mode="compact"] {
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.75fr);
  grid-template-areas:
    "instrument instrument"
    "hex        swatches"
    "sliders    swatches"
    "name       name"
    "fields     fields";
}

.hero-grid[data-mode="stack"] {
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas:
    "instrument"
    "hex"
    "name"
    "sliders"
    "swatches"
    "fields"
    "formats";
}

/*
 * The instrument is intrinsically sized off the container, which is the whole
 * stage — but it only gets one column of it, so it has to be told to fill the
 * cell instead. The cap keeps it from dwarfing the readouts on a wide stage.
 */
.hero-grid :deep(.hero-instrument) {
  width: min(100%, 340px);
}

.hero-grid[data-mode="stack"] :deep(.hero-instrument) {
  width: min(100%, 260px);
}

/* Both are laid out by the grid now, so their own widths must not fight it. */
.hero-grid :deep(.sat-swatches),
.hero-grid :deep(.sat-sliders),
.hero-grid :deep(.sat-hex),
.hero-grid :deep(.sat-formats) {
  width: 100%;
}

.hero-grid :deep(.sat-field) {
  width: auto;
  flex: 1;
}

/* The formats panel is a full-width row, so two columns read better than four
   ellipsised lines stacked in a narrow column. */
.hero-grid[data-mode="grid"] :deep(.sat-formats) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
}
</style>

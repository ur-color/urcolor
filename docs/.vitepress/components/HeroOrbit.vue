<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { type OrbitMode, docksForMode, orbitModeForWidth } from "../composables/heroOrbit";
import { useBrandHue } from "../composables/useBrandHue";
import { useHeroColor } from "../composables/useHeroColor";
import { useReducedMotion } from "../composables/useReducedMotion";
import HeroConnectors from "./HeroConnectors.vue";
import HeroInstrument from "./HeroInstrument.vue";
import HeroSatellite from "./HeroSatellite.vue";
import SatFields from "./hero/SatFields.vue";
import SatFormats from "./hero/SatFormats.vue";
import SatHex from "./hero/SatHex.vue";
import SatSliders from "./hero/SatSliders.vue";
import SatSwatches from "./hero/SatSwatches.vue";

const color = useHeroColor();
const brandHue = useBrandHue();
const reduced = useReducedMotion();

const stageEl = ref<HTMLElement>();
const instrumentWrapEl = ref<HTMLElement>();
const mode = ref<OrbitMode>("orbit");
const pulseKey = ref(0);

const docks = computed(() => docksForMode(mode.value));
const docked = computed(() => mode.value !== "stack");

/* ---------- brand hue sync (relocated from HeroDemo.vue) ---------- */

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
  pulseKey.value++;
}, { immediate: true });

/* ---------- responsive mode ---------- */

let ro: ResizeObserver | undefined;

function syncMode() {
  const w = stageEl.value?.clientWidth ?? window.innerWidth;
  mode.value = orbitModeForWidth(w);
}

/* ---------- pointer parallax ---------- */

const MAX_SHIFT = 6;
const MAX_TILT = 3;
let target = { x: 0, y: 0 };
const current = { x: 0, y: 0 };
let raf = 0;

function onPointerMove(e: PointerEvent) {
  if (reduced.value || !stageEl.value) return;
  const r = stageEl.value.getBoundingClientRect();
  if (!r.width || !r.height) return;
  target = {
    x: ((e.clientX - r.left) / r.width - 0.5) * 2,
    y: ((e.clientY - r.top) / r.height - 0.5) * 2,
  };
}

function onPointerLeave() {
  target = { x: 0, y: 0 };
}

function tick() {
  current.x += (target.x - current.x) * 0.08;
  current.y += (target.y - current.y) * 0.08;
  const el = stageEl.value;
  if (el) {
    el.style.setProperty("--px", `${(-current.x * MAX_SHIFT).toFixed(2)}px`);
    el.style.setProperty("--py", `${(-current.y * MAX_SHIFT).toFixed(2)}px`);
    el.style.setProperty("--tilt-x", `${(-current.y * MAX_TILT).toFixed(2)}deg`);
    el.style.setProperty("--tilt-y", `${(current.x * MAX_TILT).toFixed(2)}deg`);
  }
  raf = requestAnimationFrame(tick);
}

/* ---------- lifecycle ---------- */

onMounted(() => {
  syncMode();
  if (typeof ResizeObserver !== "undefined" && stageEl.value) {
    ro = new ResizeObserver(syncMode);
    ro.observe(stageEl.value);
  }
  if (!reduced.value) raf = requestAnimationFrame(tick);
});

onUnmounted(() => {
  ro?.disconnect();
  if (raf) cancelAnimationFrame(raf);
});
</script>

<template>
  <div
    ref="stageEl"
    class="hero-orbit"
    :data-mode="mode"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
  >
    <HeroConnectors
      v-if="docked"
      :stage="stageEl ?? null"
      :instrument="instrumentWrapEl ?? null"
      :docks="docks"
      :pulse-key="pulseKey"
    />

    <div
      ref="instrumentWrapEl"
      class="hero-orbit-center"
    >
      <HeroInstrument />
    </div>

    <HeroSatellite
      v-for="(dock, i) in docks"
      :id="dock.id"
      :key="dock.id"
      :angle="dock.angle"
      :depth="dock.depth"
      :docked="docked"
      :index="i"
    >
      <SatHex
        v-if="dock.id === 'hex'"
        :with-formats="mode === 'compact'"
      />
      <SatFormats v-else-if="dock.id === 'formats'" />
      <SatSwatches v-else-if="dock.id === 'swatches'" />
      <SatSliders v-else-if="dock.id === 'sliders'" />
      <SatFields v-else-if="dock.id === 'fields'" />
    </HeroSatellite>
  </div>
</template>

<style scoped>
/*
 * Radii are in container units, not viewport units: the stage is now one
 * column of a two-column hero, so its width and the viewport's have nothing to
 * do with each other. 37cqw keeps the docks clear of the instrument at every
 * stage width — the instrument is 46cqmin wide, so its radius is 23cqw, and
 * the satellites are at most 26cqw wide, putting their inner edge at 24cqw.
 */
.hero-orbit {
  --orbit-rx: clamp(130px, 35cqw, 320px);
  --orbit-ry: clamp(130px, 40cqh, 250px);
  --px: 0px;
  --py: 0px;
  --tilt-x: 0deg;
  --tilt-y: 0deg;
  position: relative;
  width: 100%;
  container-type: inline-size;
}

/*
 * `container-type: size` only where the height is determinate. Applying it in
 * stack mode, where the height is `auto`, would contain the stage's own size
 * and collapse it to zero.
 */
.hero-orbit[data-mode="orbit"],
.hero-orbit[data-mode="compact"] {
  height: min(72vh, 620px);
  min-height: 420px;
  container-type: size;
  perspective: 1200px;
}

.hero-orbit[data-mode="compact"] {
  --orbit-rx: clamp(120px, 34cqw, 290px);
  --orbit-ry: clamp(115px, 36cqh, 210px);
}

.hero-orbit-center {
  position: absolute;
  left: 50%;
  top: 50%;
  translate: -50% -50%;
  transform: rotateX(var(--tilt-x)) rotateY(var(--tilt-y));
  transform-style: preserve-3d;
}

/* Stack mode: the ellipse dissolves into ordinary vertical flow. */
.hero-orbit[data-mode="stack"] {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  height: auto;
  perspective: none;
}

.hero-orbit[data-mode="stack"] .hero-orbit-center {
  position: static;
  translate: none;
  transform: none;
  order: -1;
}
</style>

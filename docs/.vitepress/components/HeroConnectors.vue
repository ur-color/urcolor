<script setup lang="ts">
import type { Dock, Point } from "../composables/heroOrbit";
import { onUnmounted, ref, watch } from "vue";
import { connectorPath, edgePoint } from "../composables/heroOrbit";
import { useReducedMotion } from "../composables/useReducedMotion";

const props = defineProps<{
  stage: HTMLElement | null;
  instrument: HTMLElement | null;
  docks: Dock[];
  /** Bumped by the stage on every color change to trigger a pulse. */
  pulseKey: number;
}>();

const reduced = useReducedMotion();
const paths = ref<{ id: string; d: string }[]>([]);
const size = ref({ w: 0, h: 0 });
// Typed as `Element` rather than `SVGPathElement` because the repo's eslint
// globals for `.vue` files do not declare the SVG DOM interfaces, and the
// eslint config is out of scope for this component.
const pulseEls = ref<Element[]>([]);

let ro: ResizeObserver | undefined;
let frame = 0;
let gsapRef: typeof import("gsap").default | undefined;

/** The dock edge nearest the instrument, in stage-local coordinates. */
function dockAnchor(dockRect: DOMRect, stageRect: DOMRect, center: Point): Point {
  const cx = dockRect.left - stageRect.left + dockRect.width / 2;
  const cy = dockRect.top - stageRect.top + dockRect.height / 2;
  const dx = center.x - cx;
  const dy = center.y - cy;
  if (Math.abs(dx) * dockRect.height > Math.abs(dy) * dockRect.width) {
    return { x: cx + Math.sign(dx) * dockRect.width / 2, y: cy };
  }
  return { x: cx, y: cy + Math.sign(dy) * dockRect.height / 2 };
}

function measure() {
  const stage = props.stage;
  const instrument = props.instrument;
  if (!stage || !instrument) {
    paths.value = [];
    return;
  }

  const stageRect = stage.getBoundingClientRect();
  const instRect = instrument.getBoundingClientRect();
  size.value = { w: stageRect.width, h: stageRect.height };

  const center: Point = {
    x: instRect.left - stageRect.left + instRect.width / 2,
    y: instRect.top - stageRect.top + instRect.height / 2,
  };
  const radius = Math.min(instRect.width, instRect.height) / 2;

  paths.value = props.docks.flatMap((dock) => {
    const el = stage.querySelector<HTMLElement>(`[data-dock-id="${dock.id}"]`);
    if (!el) return [];
    const to = dockAnchor(el.getBoundingClientRect(), stageRect, center);
    const from = edgePoint(center, radius, dock.angle);
    return [{ id: dock.id, d: connectorPath(from, to) }];
  });
}

/** Coalesce resize bursts into one measure per frame. */
function scheduleMeasure() {
  if (frame) cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    frame = 0;
    measure();
  });
}

watch(
  () => [props.stage, props.instrument, props.docks] as const,
  ([stage]) => {
    ro?.disconnect();
    ro = undefined;
    if (!stage) {
      paths.value = [];
      return;
    }
    measure();
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(scheduleMeasure);
      ro.observe(stage);
    }
  },
  { immediate: true, flush: "post" },
);

watch(() => props.pulseKey, async () => {
  if (reduced.value || !pulseEls.value.length) return;
  if (!gsapRef) gsapRef = (await import("gsap")).default;
  const gsap = gsapRef;
  pulseEls.value.forEach((el, i) => {
    if (!el) return;
    const len = (el as { getTotalLength?: () => number }).getTotalLength?.() ?? 200;
    gsap.killTweensOf(el);
    gsap.set(el, { strokeDasharray: `24 ${len}`, strokeDashoffset: len, opacity: 1 });
    gsap.to(el, {
      strokeDashoffset: 0,
      duration: 0.6,
      ease: "power1.out",
      delay: i * 0.04,
      onComplete: () => {
        gsap.set(el, { opacity: 0 });
      },
    });
  });
});

onUnmounted(() => {
  ro?.disconnect();
  if (frame) cancelAnimationFrame(frame);
  if (gsapRef) pulseEls.value.forEach(el => el && gsapRef!.killTweensOf(el));
});
</script>

<template>
  <svg
    class="hero-connectors"
    :viewBox="`0 0 ${size.w} ${size.h}`"
    :width="size.w"
    :height="size.h"
    aria-hidden="true"
    focusable="false"
  >
    <g
      v-for="(p, i) in paths"
      :key="p.id"
    >
      <path
        class="hero-connector-base"
        :d="p.d"
      />
      <path
        :ref="el => { if (el) pulseEls[i] = el as Element; }"
        class="hero-connector-pulse"
        :d="p.d"
      />
    </g>
  </svg>
</template>

<style scoped>
.hero-connectors {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
}

.hero-connector-base {
  fill: none;
  stroke: color-mix(in srgb, var(--vp-c-brand-1) 45%, transparent);
  stroke-width: 1;
}

.hero-connector-pulse {
  fill: none;
  stroke: var(--vp-c-brand-1);
  stroke-width: 2;
  opacity: 0;
}
</style>

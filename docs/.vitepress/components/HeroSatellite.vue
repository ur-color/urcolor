<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useReducedMotion } from "../composables/useReducedMotion";

const props = defineProps<{
  id: string;
  angle: number;
  depth: 1 | 2 | 3;
  docked: boolean;
  index: number;
}>();

const innerEl = ref<HTMLElement>();
const reduced = useReducedMotion();

onMounted(async () => {
  if (reduced.value || !props.docked || !innerEl.value) return;
  // `gsap.from` starts the element at opacity 0. If the ticker never advances
  // — a hidden tab throttles rAF to nothing — the tween holds there and the
  // satellite stays invisible. Not worth an entrance nobody is watching.
  if (document.visibilityState !== "visible") return;
  const gsap = (await import("gsap")).default;
  gsap.from(innerEl.value, {
    scale: 0.8,
    opacity: 0,
    duration: 0.7,
    ease: "power3.out",
    delay: 0.15 + props.index * 0.06,
  });
});
</script>

<template>
  <div
    class="hero-dock"
    :class="{ 'hero-dock-docked': docked }"
    :data-dock-id="id"
    :style="{ '--angle': `${angle}deg`, '--depth': depth }"
  >
    <div
      ref="innerEl"
      class="hero-dock-inner"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.hero-dock {
  --px: 0px;
  --py: 0px;
}

/*
 * Two elements, because gsap and CSS cannot share one. On its first write gsap
 * stamps `translate: none; rotate: none; scale: none` onto the element to take
 * exclusive ownership of transforms — which wipes the `translate` below and
 * with it both the -50% centering and the parallax offset. So the outer
 * element is CSS-only (docking and parallax) and the inner one is gsap's
 * (entrance tween). Neither touches the other's property.
 */
.hero-dock-docked {
  position: absolute;
  left: calc(50% + cos(var(--angle)) * var(--orbit-rx));
  top: calc(50% - sin(var(--angle)) * var(--orbit-ry));
  translate:
    calc(-50% + var(--px) * var(--depth))
    calc(-50% + var(--py) * var(--depth));
  will-change: translate;
}
</style>

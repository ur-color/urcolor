<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useReducedMotion } from "../composables/useReducedMotion";

const props = withDefaults(defineProps<{
  id: string;
  index: number;
  /** Chromeless panels carry no card border or fill — used by the instrument. */
  plain?: boolean;
  label?: string;
}>(), { plain: false, label: undefined });

const innerEl = ref<HTMLElement>();
const reduced = useReducedMotion();

onMounted(async () => {
  if (reduced.value || !innerEl.value) return;
  // `gsap.from` starts the element at opacity 0. If the ticker never advances
  // — a hidden tab throttles rAF to nothing — the tween holds there and the
  // panel stays invisible. Not worth an entrance nobody is watching.
  if (document.visibilityState !== "visible") return;
  const gsap = (await import("gsap")).default;
  gsap.from(innerEl.value, {
    y: 12,
    opacity: 0,
    duration: 0.5,
    ease: "power3.out",
    delay: 0.1 + props.index * 0.05,
  });
});
</script>

<template>
  <div
    class="hero-panel"
    :class="{ 'hero-panel-plain': plain }"
    :data-panel-id="id"
    :style="{ gridArea: id }"
  >
    <div
      ref="innerEl"
      class="hero-panel-inner"
    >
      <span
        v-if="label"
        class="hero-panel-label"
      >{{ label }}</span>
      <slot />
    </div>
  </div>
</template>

<style scoped>
/*
 * Two elements, because gsap and CSS cannot share one: on its first write gsap
 * stamps `translate: none; rotate: none; scale: none` onto the element to take
 * exclusive ownership of transforms. The outer element is the grid cell, the
 * inner one is gsap's.
 */
.hero-panel {
  min-width: 0;
  display: flex;
}

.hero-panel-inner {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--vp-c-divider) 80%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--vp-c-bg-soft) 55%, transparent);
  backdrop-filter: blur(10px);
}

.hero-panel-plain .hero-panel-inner {
  padding: 0;
  border: none;
  background: none;
  backdrop-filter: none;
  align-items: center;
}

.hero-panel-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}
</style>

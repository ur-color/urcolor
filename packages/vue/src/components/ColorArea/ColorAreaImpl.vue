<script lang="ts">
import type { PrimitiveProps } from "reka-ui";

export type ColorAreaImplEmits = {
  slideStart: [event: PointerEvent];
  slideMove: [event: PointerEvent];
  slideEnd: [event: PointerEvent];
  homeKeyDown: [event: KeyboardEvent];
  endKeyDown: [event: KeyboardEvent];
  pageUpKeyDown: [event: KeyboardEvent];
  pageDownKeyDown: [event: KeyboardEvent];
  stepKeyDown: [event: KeyboardEvent];
};

export interface ColorAreaImplProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
}
</script>

<script setup lang="ts">
import { Primitive } from "reka-ui";
import { ARROW_KEYS, PAGE_KEYS } from "./utils";
import { injectColorAreaRootContext } from "./ColorAreaRoot.vue";

const props = withDefaults(defineProps<ColorAreaImplProps>(), { as: "div" });

const emits = defineEmits<ColorAreaImplEmits>();
const rootContext = injectColorAreaRootContext();
</script>

<template>
  <Primitive
    data-slider-area-impl
    v-bind="props"
    @keydown="(event: KeyboardEvent) => {
      if (event.key === 'Home') {
        emits('homeKeyDown', event)
        event.preventDefault();
      }
      else if (event.key === 'End') {
        emits('endKeyDown', event)
        event.preventDefault();
      }
      else if (event.key === 'PageUp') {
        emits('pageUpKeyDown', event)
        event.preventDefault();
      }
      else if (event.key === 'PageDown') {
        emits('pageDownKeyDown', event)
        event.preventDefault();
      }
      else if (PAGE_KEYS.concat(ARROW_KEYS).includes(event.key)) {
        emits('stepKeyDown', event)
        event.preventDefault();
      }
    }"
    @pointerdown="(event: PointerEvent) => {
      const target = event.target as HTMLElement;
      target.setPointerCapture(event.pointerId);
      event.preventDefault();
      if (rootContext.thumbXElements.value.includes(target) || rootContext.thumbYElements.value.includes(target)) {
        target.focus();
      }
      else {
        emits('slideStart', event)
      }
    }"
    @pointermove="(event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (target.hasPointerCapture(event.pointerId)) emits('slideMove', event);
    }"
    @pointerup="(event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (target.hasPointerCapture(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
        emits('slideEnd', event)
      }
    }"
  >
    <slot />
  </Primitive>
</template>

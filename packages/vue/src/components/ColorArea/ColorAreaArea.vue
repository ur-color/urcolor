<script lang="ts">
import type { PrimitiveProps } from "reka-ui";

export interface ColorAreaAreaProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
}
</script>

<script setup lang="ts">
import { Primitive, useForwardExpose } from "reka-ui";
import { injectColorAreaRootContext } from "./ColorAreaRoot.vue";

withDefaults(defineProps<ColorAreaAreaProps>(), {
  as: "div",
});

const rootContext = injectColorAreaRootContext();
useForwardExpose();

function onPointerDown(event: PointerEvent) {
  if (rootContext.disabled.value)
    return;
  const target = event.target as HTMLElement;
  target.setPointerCapture(event.pointerId);
  event.preventDefault();
  const thumb = rootContext.thumbRef.value;
  if (thumb && thumb.contains(target)) {
    thumb.focus();
  } else {
    rootContext.snapshotValues();
    rootContext.handleSlideStart(event);
  }
}

function onPointerMove(event: PointerEvent) {
  if (rootContext.disabled.value)
    return;
  const target = event.target as HTMLElement;
  if (target.hasPointerCapture(event.pointerId))
    rootContext.handleSlideMove(event);
}

function onPointerUp(event: PointerEvent) {
  if (rootContext.disabled.value)
    return;
  const target = event.target as HTMLElement;
  if (target.hasPointerCapture(event.pointerId)) {
    target.releasePointerCapture(event.pointerId);
    rootContext.handleSlideEnd();
  }
}
</script>

<template>
  <Primitive
    :as-child="asChild"
    :as="as"
    role="application"
    aria-roledescription="Color picker"
    :aria-disabled="rootContext.disabled.value || undefined"
    :data-disabled="rootContext.disabled.value ? '' : undefined"
    :style="{ touchAction: 'none' }"
    @keydown="rootContext.handleKeyDown"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
  >
    <slot />
  </Primitive>
</template>

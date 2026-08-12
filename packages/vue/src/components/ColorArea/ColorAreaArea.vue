<script lang="ts">
import type { PrimitiveProps } from "../../primitives/types";

export interface ColorAreaAreaProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
}
</script>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { Primitive, useForwardExpose } from "reka-ui";
import { injectColorAreaRootContext } from "./ColorAreaRoot.vue";
import { usePointerDrag } from "../../shared/usePointerDrag";

withDefaults(defineProps<ColorAreaAreaProps>(), {
  as: "div",
});

const rootContext = injectColorAreaRootContext();
const { forwardRef, currentElement: areaElement } = useForwardExpose();

onMounted(() => {
  if (areaElement.value)
    rootContext.areaElement.value = areaElement.value;
});
onUnmounted(() => {
  if (rootContext.areaElement.value === areaElement.value)
    rootContext.areaElement.value = undefined;
});

// The root owns this gesture's rect and value maths (it measures the area
// element itself, with thumb-size offsets), so only the lifecycle lives here.
// No `target` is passed: this composable instance never reads `drag.rect`
// (the root's own rectRef is what the maths uses), so there's nothing to
// measure a rect against here.
const drag = usePointerDrag({
  disabled: rootContext.disabled,
  onMove(event, phase) {
    if (phase === "move") {
      rootContext.handleSlideMove(event);
      return;
    }
    // A press that lands on the thumb focuses it and grabs the pointer, but
    // must not restart the slide from under the cursor.
    const thumb = rootContext.thumbRef.value;
    if (thumb && thumb.contains(event.target as HTMLElement)) {
      thumb.focus();
      return;
    }
    rootContext.snapshotValues();
    rootContext.handleSlideStart(event);
  },
  onEnd() {
    rootContext.handleSlideEnd();
  },
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as-child="asChild"
    :as="as"
    role="application"
    aria-roledescription="Color picker"
    :aria-disabled="rootContext.disabled.value || undefined"
    :data-disabled="rootContext.disabled.value ? '' : undefined"
    :style="{ touchAction: 'none' }"
    @keydown="rootContext.handleKeyDown"
    @pointerdown="drag.onPointerDown"
    @pointermove="drag.onPointerMove"
    @pointerup="drag.onPointerUp"
    @pointercancel="drag.onPointerCancel"
  >
    <slot />
  </Primitive>
</template>

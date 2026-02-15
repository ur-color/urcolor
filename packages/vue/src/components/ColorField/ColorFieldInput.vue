<script lang="ts">
import type { PrimitiveProps } from "reka-ui";

export interface ColorFieldInputProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
}
</script>

<script setup lang="ts">
import { nextTick, onMounted } from "vue";
import { Primitive, useForwardExpose } from "reka-ui";
import { injectColorFieldRootContext } from "./ColorFieldRoot.vue";

withDefaults(defineProps<ColorFieldInputProps>(), {
  as: "input",
});

const rootContext = injectColorFieldRootContext();
const { forwardRef, currentElement } = useForwardExpose();

onMounted(() => {
  if (currentElement.value)
    rootContext.onInputElement(currentElement.value as HTMLInputElement);
});

function onInput(event: Event) {
  const target = event.target as HTMLInputElement;
  rootContext.onInputChange(target.value);
}

function onFocus(event: FocusEvent) {
  const target = event.target as HTMLInputElement;
  nextTick(() => target.select()).catch(() => {});
}

function onBlur() {
  const parsed = rootContext.displayValue.value;
  rootContext.commitValue(
    rootContext.modelValue.value !== undefined
      ? rootContext.modelValue.value
      : undefined,
  );
}

function onKeydown(event: KeyboardEvent) {
  if (rootContext.disabled.value || rootContext.readOnly.value) return;

  if (event.key === "Enter") {
    rootContext.commitValue(rootContext.modelValue.value);
    return;
  }

  switch (event.key) {
    case "ArrowUp":
      event.preventDefault();
      rootContext.handleIncrease();
      break;
    case "ArrowDown":
      event.preventDefault();
      rootContext.handleDecrease();
      break;
    case "PageUp":
      event.preventDefault();
      rootContext.handleIncrease(10);
      break;
    case "PageDown":
      event.preventDefault();
      rootContext.handleDecrease(10);
      break;
    case "Home":
      event.preventDefault();
      rootContext.handleMinMaxValue("min");
      break;
    case "End":
      event.preventDefault();
      rootContext.handleMinMaxValue("max");
      break;
  }
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :as-child="asChild"
    type="text"
    role="spinbutton"
    :aria-valuenow="rootContext.modelValue.value"
    :aria-valuemin="undefined"
    :aria-valuemax="undefined"
    :value="rootContext.displayValue.value"
    :disabled="rootContext.disabled.value || undefined"
    :readonly="rootContext.readOnly.value || undefined"
    :data-disabled="rootContext.disabled.value ? '' : undefined"
    :data-readonly="rootContext.readOnly.value ? '' : undefined"
    autocomplete="off"
    autocorrect="off"
    spellcheck="false"
    inputmode="text"
    @input="onInput"
    @focus="onFocus"
    @blur="onBlur"
    @keydown="onKeydown"
  >
    <slot />
  </Primitive>
</template>

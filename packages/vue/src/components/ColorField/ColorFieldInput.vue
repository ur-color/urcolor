<script lang="ts">
import type { PrimitiveProps } from "reka-ui";

export interface ColorFieldInputProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
}
</script>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import { Primitive, useForwardExpose } from "reka-ui";
import { injectColorFieldRootContext } from "./ColorFieldRoot.vue";
import { channelLabel } from "../../shared/channel-labels";

withDefaults(defineProps<ColorFieldInputProps>(), {
  as: "input",
});

const rootContext = injectColorFieldRootContext();
const { forwardRef, currentElement } = useForwardExpose();

const isFocused = ref(false);
const channelName = computed(() => channelLabel(rootContext.colorSpace.value, rootContext.channel.value));

onMounted(() => {
  if (currentElement.value)
    rootContext.onInputElement(currentElement.value as HTMLInputElement);
});

function onInput(event: Event) {
  const target = event.target as HTMLInputElement;
  rootContext.onInputChange(target.value);
}

function onFocus(event: FocusEvent) {
  isFocused.value = true;
  const target = event.target as HTMLInputElement;
  nextTick(() => target.select()).catch(() => {});
}

function onBlur() {
  isFocused.value = false;
  if (rootContext.disabled.value || rootContext.readonly.value) return;
  rootContext.commitValue(
    rootContext.modelValue.value !== undefined
      ? rootContext.modelValue.value
      : undefined,
  );
}

function onWheel(event: WheelEvent) {
  if (!isFocused.value)
    return;
  rootContext.handleWheel(event);
}

function onBeforeInput(event: InputEvent) {
  if (rootContext.format.value === "hex")
    return;
  if (event.data && /[^\d.-]/.test(event.data)) {
    event.preventDefault();
    return;
  }
  const target = event.target as HTMLInputElement;
  const next = target.value.slice(0, target.selectionStart ?? 0) + (event.data ?? "") + target.value.slice(target.selectionEnd ?? 0);
  if (next === "" || next === "-" || next === "." || next === "-.")
    return;
  if (Number.isNaN(Number(next)))
    event.preventDefault();
}

function onKeydown(event: KeyboardEvent) {
  if (rootContext.disabled.value || rootContext.readonly.value) return;

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
    :aria-valuemin="rootContext.min.value"
    :aria-valuemax="rootContext.max.value"
    :aria-valuetext="rootContext.displayValue.value"
    :aria-label="($attrs['aria-label'] as string) || channelName"
    :value="rootContext.displayValue.value"
    :placeholder="rootContext.placeholder.value"
    :disabled="rootContext.disabled.value || undefined"
    :readonly="rootContext.readonly.value || undefined"
    :data-disabled="rootContext.disabled.value ? '' : undefined"
    :data-readonly="rootContext.readonly.value ? '' : undefined"
    autocomplete="off"
    autocorrect="off"
    spellcheck="false"
    :inputmode="rootContext.format.value === 'hex' ? 'text' : 'numeric'"
    @input="onInput"
    @focus="onFocus"
    @blur="onBlur"
    @keydown="onKeydown"
    @wheel="onWheel"
    @beforeinput="onBeforeInput"
  >
    <slot />
  </Primitive>
</template>

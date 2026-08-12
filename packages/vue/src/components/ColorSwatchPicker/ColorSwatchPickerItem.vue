<script lang="ts">
import type { Ref } from "vue";
import type { ListboxItemProps } from "../../primitives/types";
import { createContext, ListboxItem, useForwardExpose } from "reka-ui";

export interface ColorSwatchPickerItemProps extends /* @vue-ignore */ ListboxItemProps {
  as?: string;
  asChild?: boolean;
  /** The colour this swatch represents, as a CSS colour string. */
  value: string;
  /** When `true`, prevents the user from selecting this swatch. */
  disabled?: boolean;
}

export const [injectColorSwatchPickerItemContext, provideColorSwatchPickerItemContext]
  = createContext<{ color: Ref<string> }>("ColorSwatchPickerItem");
</script>

<script setup lang="ts">
import { computed, toRef } from "vue";
import { Color } from "@urcolor/core";

const props = withDefaults(defineProps<ColorSwatchPickerItemProps>(), {
  as: "div",
  disabled: false,
});

useForwardExpose();

provideColorSwatchPickerItemContext({ color: toRef(props, "value") });

// Announce the normalised colour rather than the raw key, falling back to the
// raw value when it is not a colour we can parse.
const accessibleName = computed(() => {
  const parsed = Color.parse(props.value);
  return parsed ? parsed.toString() : props.value;
});
</script>

<template>
  <ListboxItem
    :value="value"
    :disabled="disabled"
    :as="as"
    :as-child="asChild"
    :aria-label="accessibleName"
    :data-color="value"
    :style="{ '--urcolor-swatch-picker-item-color': value }"
  >
    <slot />
  </ListboxItem>
</template>

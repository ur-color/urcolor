<script lang="ts">
import type { Ref } from "vue";
import { createContext, SliderRoot, useForwardExpose } from "reka-ui";
import "internationalized-color/css";
import { Color } from "internationalized-color";

export interface ColorSliderRootProps {
  /** The controlled color value. Can be bind as `v-model`. */
  modelValue?: Color | string | null;
  /** The color space mode (e.g. 'hsl', 'oklch'). */
  colorSpace?: string;
  /** Which channel this slider controls (e.g. 'h', 's', 'l'). */
  channel?: string;
  /** When `true`, prevents the user from interacting with the slider. */
  disabled?: boolean;
  /** The reading direction. */
  dir?: "ltr" | "rtl";
  /** Whether the slider is visually inverted. */
  inverted?: boolean;
  /** The orientation of the slider. */
  orientation?: "horizontal" | "vertical";
  /** When true, reflects the color's alpha channel as canvas opacity on the gradient. */
  alpha?: boolean;
}

export type ColorSliderRootEmits = {
  "update:modelValue": [payload: Color | undefined];
  "valueCommit": [payload: Color];
};

export interface ColorSliderRootContext {
  colorRef: Ref<Color | undefined>;
  alpha: Ref<boolean>;
  channel: Ref<string>;
}

export const [injectColorSliderRootContext, provideColorSliderRootContext]
  = createContext<ColorSliderRootContext>("ColorSliderRoot");
</script>

<script setup lang="ts">
import { computed, shallowRef, toRef, watch } from "vue";
import { getChannelConfig, displayToCulori, culoriToDisplay } from "@urcolor/core";

const props = withDefaults(defineProps<ColorSliderRootProps>(), {
  colorSpace: "hsl",
  channel: "h",
  disabled: false,
  alpha: false,
});
const emit = defineEmits<ColorSliderRootEmits>();

useForwardExpose();

function parseColor(v: Color | string | null | undefined): Color | undefined {
  if (!v) return undefined;
  if (v instanceof Color) return v;
  return Color.parse(v) ?? undefined;
}

const colorRef = shallowRef<Color | undefined>(parseColor(props.modelValue));

watch(() => props.modelValue, (val) => {
  const parsed = parseColor(val);
  if (parsed) colorRef.value = parsed;
});

const isAlpha = computed(() => props.channel === "alpha");

const alphaConfig = { key: "alpha", label: "Alpha", min: 0, max: 100, step: 1, format: "percentage" as const, culoriMin: 0, culoriMax: 1 };
const channelConfig = computed(() => isAlpha.value ? alphaConfig : getChannelConfig(props.colorSpace, props.channel));

// Extract display value from Color for the internal slider
const internalValue = computed<number[]>({
  get() {
    if (!colorRef.value || !channelConfig.value) return [channelConfig.value?.min ?? 0];
    if (isAlpha.value) {
      return [Math.round((colorRef.value.alpha ?? 1) * 100)];
    }
    const converted = colorRef.value.to(props.colorSpace);
    if (!converted) return [channelConfig.value.min];
    const raw = converted.get(props.channel, 0);
    return [culoriToDisplay(channelConfig.value, raw)];
  },
  set(val: number[]) {
    if (!colorRef.value || !channelConfig.value || val[0] === undefined) return;
    let newColor: Color | undefined;
    if (isAlpha.value) {
      newColor = colorRef.value.set({ alpha: val[0] / 100 });
    } else {
      const culoriVal = displayToCulori(channelConfig.value, val[0]);
      newColor = colorRef.value.set({
        mode: props.colorSpace,
        [props.channel]: culoriVal,
      });
    }
    if (newColor) {
      colorRef.value = newColor;
      emit("update:modelValue", newColor);
    }
  },
});

function handleValueCommit() {
  if (colorRef.value) {
    emit("valueCommit", colorRef.value);
  }
}

provideColorSliderRootContext({ colorRef, alpha: toRef(props, "alpha"), channel: toRef(props, "channel") });
</script>

<template>
  <SliderRoot
    v-model="internalValue"
    :min="channelConfig?.min ?? 0"
    :max="channelConfig?.max ?? 100"
    :step="channelConfig?.step ?? 1"
    :disabled="disabled"
    :dir="dir"
    :inverted="inverted"
    :orientation="orientation"
    @value-commit="handleValueCommit"
  >
    <slot />
  </SliderRoot>
</template>

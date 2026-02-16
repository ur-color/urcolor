<script setup lang="ts">
import { computed } from "vue";
import { Color } from "internationalized-color";
import { getChannelConfig } from "@urcolor/core";
import {
  Label,
  CheckboxRoot,
  CheckboxIndicator,
} from "reka-ui";
import {
  ColorFieldRoot,
  ColorFieldInput,
  ColorFieldIncrement,
  ColorFieldDecrement,
} from "@urcolor/vue";
import { Icon } from "@iconify/vue";

const props = defineProps<{
  color: Color;
  colorSpace: string;
  channels: { key: string; label: string }[];
  areaOverrides: Record<string, number>;
  sliderOverrides: Record<string, Record<string, number>>;
  alphaSliderOverrides: Record<string, number>;
}>();

const emit = defineEmits<{
  "update:areaOverrides": [value: Record<string, number>];
  "update:sliderOverrides": [value: Record<string, Record<string, number>>];
  "update:alphaSliderOverrides": [value: Record<string, number>];
}>();

const allChannels = computed(() => [
  ...props.channels,
  { key: "alpha", label: "Alpha" },
]);

interface GradientEntry {
  id: string;
  label: string;
  overrides: Record<string, number>;
  update: (overrides: Record<string, number>) => void;
}

const gradients = computed<GradientEntry[]>(() => {
  const entries: GradientEntry[] = [
    {
      id: "area",
      label: "Area",
      overrides: props.areaOverrides,
      update: (o) => emit("update:areaOverrides", o),
    },
  ];
  for (const ch of props.channels) {
    entries.push({
      id: `slider-${ch.key}`,
      label: `${ch.label} Slider`,
      overrides: props.sliderOverrides[ch.key] ?? { alpha: 1 },
      update: (o) =>
        emit("update:sliderOverrides", {
          ...props.sliderOverrides,
          [ch.key]: o,
        }),
    });
  }
  entries.push({
    id: "alpha-slider",
    label: "Alpha Slider",
    overrides: props.alphaSliderOverrides,
    update: (o) => emit("update:alphaSliderOverrides", o),
  });
  return entries;
});

function isChannelEnabled(gradient: GradientEntry, channelKey: string): boolean {
  return channelKey in gradient.overrides;
}

function toggleChannel(gradient: GradientEntry, channelKey: string) {
  if (isChannelEnabled(gradient, channelKey)) {
    const { [channelKey]: _, ...rest } = gradient.overrides;
    gradient.update(rest);
  } else {
    let val: number;
    if (channelKey === "alpha") {
      val = props.color.getChannelValue("alpha");
    } else {
      val = props.color.getChannelValue(props.colorSpace, channelKey);
    }
    gradient.update({ ...gradient.overrides, [channelKey]: val });
  }
}

function buildOverrideColor(overrides: Record<string, number>): Color {
  let c = props.color;
  for (const [key, val] of Object.entries(overrides)) {
    if (key === "alpha") {
      c = c.set({ alpha: val });
    } else {
      c = c.set({ mode: props.colorSpace, [key]: val });
    }
  }
  return c;
}

function onFieldUpdate(
  gradient: GradientEntry,
  channelKey: string,
  newColor: Color | undefined,
) {
  if (!newColor) return;
  const cfg = channelKey === "alpha"
    ? null
    : getChannelConfig(props.colorSpace, channelKey);
  let val: number;
  if (channelKey === "alpha") {
    val = newColor.getChannelValue("alpha");
  } else if (cfg) {
    val = newColor.getChannelValue(props.colorSpace, channelKey);
  } else {
    return;
  }
  gradient.update({ ...gradient.overrides, [channelKey]: val });
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div
      v-for="gradient in gradients"
      :key="gradient.id"
      class="flex flex-col gap-1.5"
    >
      <span class="text-xs font-semibold text-(--vp-c-text-2)">
        {{ gradient.label }}
      </span>
      <div class="flex flex-wrap items-end gap-2">
        <div
          v-for="ch in allChannels"
          :key="`${gradient.id}-${ch.key}`"
          class="flex min-w-[80px] flex-1 flex-col gap-1"
        >
          <div class="flex items-center gap-1.5">
            <CheckboxRoot
              :checked="isChannelEnabled(gradient, ch.key)"
              class="
                box-border! flex! size-[18px]! shrink-0! cursor-pointer! appearance-none!
                items-center! justify-center! rounded! border! border-solid!
                border-(--vp-c-divider)! bg-(--vp-c-bg)! p-0!
                data-[state=checked]:border-(--vp-c-brand-1,#3451b2)!
                data-[state=checked]:bg-(--vp-c-brand-1,#3451b2)!
              "
              @update:checked="toggleChannel(gradient, ch.key)"
            >
              <CheckboxIndicator class="flex items-center justify-center text-white">
                <Icon
                  icon="lucide:check"
                  class="size-3"
                />
              </CheckboxIndicator>
            </CheckboxRoot>
            <Label
              :for="`override-${gradient.id}-${ch.key}`"
              class="text-xs font-semibold text-(--vp-c-text-2)"
            >{{ ch.label.charAt(0).toUpperCase() }}</Label>
          </div>
          <ColorFieldRoot
            :model-value="buildOverrideColor(gradient.overrides)"
            :color-space="colorSpace"
            :channel="ch.key"
            :disabled="!isChannelEnabled(gradient, ch.key)"
            class="
              color-field-root flex items-center overflow-hidden rounded-md border
              border-(--vp-c-divider) bg-(--vp-c-bg)
              aria-disabled:opacity-40
            "
            @update:model-value="(c: any) => onFieldUpdate(gradient, ch.key, c)"
          >
            <ColorFieldDecrement
              class="
                flex size-8 shrink-0 cursor-pointer items-center justify-center
                border-r border-none border-r-(--vp-c-divider) bg-transparent
                text-lg leading-none text-(--vp-c-text-2) select-none
                hover:not-disabled:bg-(--vp-c-bg-soft)
                hover:not-disabled:text-(--vp-c-text-1)
                disabled:cursor-default disabled:opacity-30
              "
            >
              &minus;
            </ColorFieldDecrement>
            <ColorFieldInput
              :id="`override-${gradient.id}-${ch.key}`"
              class="
                w-0 min-w-0 flex-1 border-none bg-transparent px-0.5 py-1
                text-center font-mono text-[13px] text-(--vp-c-text-1)
                outline-none
              "
            />
            <ColorFieldIncrement
              class="
                flex size-8 shrink-0 cursor-pointer items-center justify-center
                border-l border-none border-l-(--vp-c-divider) bg-transparent
                text-lg leading-none text-(--vp-c-text-2) select-none
                hover:not-disabled:bg-(--vp-c-bg-soft)
                hover:not-disabled:text-(--vp-c-text-1)
                disabled:cursor-default disabled:opacity-30
              "
            >
              +
            </ColorFieldIncrement>
          </ColorFieldRoot>
        </div>
      </div>
    </div>
  </div>
</template>

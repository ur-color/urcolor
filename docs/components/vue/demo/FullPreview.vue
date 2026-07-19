<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { colorSpaces, getChannelConfig, type SpaceId } from "@urcolor/core";
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectPortal,
  SelectViewport,
  SelectItem,
  SelectItemText,
  SelectIcon,
  Label,
  Toggle,
  ToggleGroupRoot,
  ToggleGroupItem,
  TooltipRoot,
  TooltipTrigger,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
} from "reka-ui";
import { Icon } from "@iconify/vue";
import FullPreviewOverrides from "./FullPreviewOverrides.vue";
import {
  ColorAreaRoot,
  ColorAreaGradient,
  ColorAreaCheckerboard,
  ColorAreaThumb,
  ColorSliderRoot,
  ColorSliderTrack,
  ColorSliderGradient,
  ColorSliderCheckerboard,
  ColorSliderThumb,
  ColorFieldRoot,
  ColorFieldInput,
  ColorFieldIncrement,
  ColorFieldDecrement,
  ColorSwatchRoot,
  useColor,
} from "@urcolor/vue";

const colorSpace = ref<SpaceId>("hsv");
const invertedX = ref(false);
const invertedY = ref(false);

const { color } = useColor("hsl(0, 100%, 50%)");

const spaceConfig = computed(() => colorSpaces[colorSpace.value]);
const channels = computed(() => spaceConfig.value?.channels ?? []);

const alphaChannel = { key: "alpha", label: "Alpha" };
const channelsWithAlpha = computed(() => [...channels.value, alphaChannel]);

const selectedXChannel = ref(channels.value[0]?.key ?? "h");
const selectedYChannel = ref(channels.value[1]?.key ?? "s");

// Reset selected channels when color space changes
watch(colorSpace, () => {
  selectedXChannel.value = channels.value[0]?.key ?? "h";
  selectedYChannel.value = channels.value[1]?.key ?? "s";
});

// Prevent both selects from having the same channel
watch(selectedXChannel, (val) => {
  if (val === selectedYChannel.value) {
    const other = channelsWithAlpha.value.find(ch => ch.key !== val);
    if (other) selectedYChannel.value = other.key;
  }
});
watch(selectedYChannel, (val) => {
  if (val === selectedXChannel.value) {
    const other = channelsWithAlpha.value.find(ch => ch.key !== val);
    if (other) selectedXChannel.value = other.key;
  }
});

const xChannel = computed(() => selectedXChannel.value);
const yChannel = computed(() => selectedYChannel.value);
// The remaining channel(s) become sliders
const sliderChannels = computed(() => channels.value);

// Generate slider gradient colors for each slider channel
function getSliderColors(channelKey: string): string[] {
  if (channelKey === "alpha") {
    const steps = 7;
    const colors: string[] = [];
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      colors.push(color.value.withAlpha(t).toString());
    }
    return colors;
  }
  const cfg = getChannelConfig(colorSpace.value, channelKey);
  if (!cfg) return ["black", "white"];
  const steps = 7;
  const colors: string[] = [];
  const cMin = cfg.nativeMin ?? cfg.min;
  const cMax = cfg.nativeMax ?? cfg.max;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const val = cMin + t * (cMax - cMin);
    colors.push(color.value.with({ space: colorSpace.value, [channelKey]: val }).toString());
  }
  return colors;
}

// A short, informative label for a11y announcements — no color-naming
// feature is available, so we describe the color by its hex value.
const colorHex = computed(() => color.value.toString("hex"));

// Channel override refs for each gradient
const areaOverrides = ref<Record<string, number>>({ });
const sliderOverrides = ref<Record<string, Record<string, number>>>({});
const alphaSliderOverrides = ref<Record<string, number>>({ });

// Initialize slider overrides when color space changes
watch(colorSpace, () => {
  const init: Record<string, Record<string, number>> = {};
  for (const ch of channels.value) {
    init[ch.key] = { };
  }
  sliderOverrides.value = init;
}, { immediate: true });

const spaceKeys = Object.keys(colorSpaces);
</script>

<template>
  <div
    class="
      preview-grid grid grid-cols-[auto_1fr] items-center gap-3 rounded-xl
      border border-(--vp-c-divider) bg-(--vp-c-bg-alt) p-6
      max-md:p-4
    "
  >
    <!-- Row 1: [XY svg] [X channel + invert ... color space] -->
    <div class="flex items-center justify-center">
      <ColorSwatchRoot
        :model-value="color"
        :alpha="true"
        class="
          color-swatch relative block aspect-square w-full self-end
          overflow-hidden rounded-md border border-(--vp-c-divider)!
        "
      />
    </div>
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <TooltipProvider :delay-duration="300">
          <ToggleGroupRoot
            ref="toggleGroupX"
            v-model="selectedXChannel"
            type="single"
            class="
              inline-flex overflow-hidden rounded-md border
              border-(--vp-c-divider)
            "
          >
            <TooltipRoot
              v-for="ch in channelsWithAlpha"
              :key="ch.key"
            >
              <TooltipTrigger as-child>
                <ToggleGroupItem
                  :value="ch.key"
                  :disabled="ch.key === selectedYChannel"
                  :data-active="ch.key === selectedXChannel ? '' : undefined"
                  class="
                    size-[30px] cursor-pointer border-r border-none
                    border-r-(--vp-c-divider) bg-(--vp-c-bg) p-0
                    font-(family-name:--vp-font-family-mono)! text-[13px]
                    font-medium text-(--vp-c-text-2)
                    last:border-r-0
                    disabled:cursor-default disabled:bg-(--vp-c-bg-alt)
                    disabled:text-(--vp-c-text-3,#8e8e93)! disabled:line-through
                  "
                >
                  {{ ch.label.charAt(0).toUpperCase() }}
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent
                  class="tooltip-content"
                  :side-offset="5"
                >
                  {{ ch.label }}
                </TooltipContent>
              </TooltipPortal>
            </TooltipRoot>
          </ToggleGroupRoot>
        </TooltipProvider>
        <TooltipProvider>
          <TooltipRoot>
            <TooltipTrigger as-child>
              <Toggle
                v-model="invertedX"
                :data-active="invertedX ? '' : undefined"
                aria-label="Invert X axis"
                class="
                  size-8 cursor-pointer rounded-md border!
                  border-(--vp-c-divider)! bg-(--vp-c-bg)
                  font-(family-name:--vp-font-family-mono)! text-[13px]
                  font-medium text-(--vp-c-text-2)
                "
              >
                I
              </Toggle>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent
                class="tooltip-content"
                :side-offset="5"
              >
                Invert X
              </TooltipContent>
            </TooltipPortal>
          </TooltipRoot>
        </TooltipProvider>
      </div>
      <div
        class="flex shrink-0 items-center gap-2"
      >
        <SelectRoot v-model="colorSpace">
          <SelectTrigger
            class="
              box-border inline-flex h-8 shrink-0 cursor-pointer items-center
              justify-between gap-1 overflow-hidden rounded-md border!
              border-(--vp-c-divider)! bg-(--vp-c-bg) px-2! py-1 text-[13px]
            "
            aria-label="Color space"
          >
            <SelectValue placeholder="Select space" />
            <SelectIcon class="size-3.5 shrink-0 text-(--vp-c-text-2)">
              <Icon icon="lucide:chevron-down" />
            </SelectIcon>
          </SelectTrigger>
          <SelectPortal>
            <SelectContent
              class="select-content"
              position="popper"
              :side-offset="4"
              :body-lock="false"
            >
              <SelectViewport class="max-h-[200px] overflow-y-auto">
                <SelectItem
                  v-for="key in spaceKeys"
                  :key="key"
                  :value="key"
                  class="
                    cursor-pointer rounded-md px-2.5 py-1.5 text-[13px]
                    outline-none
                    hover:bg-(--vp-c-bg-soft)
                    data-highlighted:bg-(--vp-c-bg-soft)
                    data-[state=checked]:font-semibold
                  "
                >
                  <SelectItemText>{{ colorSpaces[key]?.label }}</SelectItemText>
                </SelectItem>
              </SelectViewport>
            </SelectContent>
          </SelectPortal>
        </SelectRoot>
      </div>
    </div>

    <!-- Row 2: [Y channel vertical] [ColorArea] -->
    <div
      class="flex flex-col items-center justify-center gap-2 self-start"
    >
      <TooltipProvider :delay-duration="300">
        <ToggleGroupRoot
          ref="toggleGroupY"
          v-model="selectedYChannel"
          type="single"
          orientation="vertical"
          class="
            inline-flex flex-col overflow-hidden rounded-md border
            border-(--vp-c-divider)
          "
        >
          <TooltipRoot
            v-for="ch in channelsWithAlpha"
            :key="ch.key"
          >
            <TooltipTrigger as-child>
              <ToggleGroupItem
                :value="ch.key"
                :disabled="ch.key === selectedXChannel"
                :data-active="ch.key === selectedYChannel ? '' : undefined"
                class="
                  size-[30px] cursor-pointer border-b border-none
                  border-b-(--vp-c-divider) bg-(--vp-c-bg) p-0
                  font-(family-name:--vp-font-family-mono)! text-[13px]
                  font-medium text-(--vp-c-text-2)
                  last:border-b-0
                  disabled:cursor-default disabled:bg-(--vp-c-bg-alt)
                  disabled:text-(--vp-c-text-3,#8e8e93)! disabled:line-through
                "
              >
                {{ ch.label.charAt(0).toUpperCase() }}
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent
                class="tooltip-content"
                side="left"
                :side-offset="5"
              >
                {{ ch.label }}
              </TooltipContent>
            </TooltipPortal>
          </TooltipRoot>
        </ToggleGroupRoot>
      </TooltipProvider>
      <TooltipProvider>
        <TooltipRoot>
          <TooltipTrigger as-child>
            <Toggle
              v-model="invertedY"
              :data-active="invertedY ? '' : undefined"
              aria-label="Invert Y axis"
              class="
                size-8 cursor-pointer rounded-md border!
                border-(--vp-c-divider)! bg-(--vp-c-bg)
                font-(family-name:--vp-font-family-mono)! text-[13px]
                font-medium text-(--vp-c-text-2)
              "
            >
              I
            </Toggle>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent
              class="tooltip-content"
              side="left"
              :side-offset="5"
            >
              Invert Y
            </TooltipContent>
          </TooltipPortal>
        </TooltipRoot>
      </TooltipProvider>
    </div>
    <ColorAreaRoot
      v-model="color"
      :color-space="colorSpace"
      :channel-x="xChannel"
      :channel-y="yChannel"
      :inverted-x="invertedX"
      :inverted-y="invertedY"
      as="div"
      alpha
      class="
        relative block h-[200px] w-full cursor-crosshair touch-none
        overflow-clip rounded-xl self-start
      "
      :aria-label="`Color picker, selected: ${colorHex}`"
    >
      <ColorAreaCheckerboard />
      <ColorAreaGradient
        as="div"
        class="absolute inset-0"
        :channel-overrides="areaOverrides"
      />
      <ColorAreaThumb
        as="div"
        class="
          absolute size-6 transform-(--reka-slider-area-thumb-transform)
          rounded-full border-2 border-white
          shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
        "
        :aria-label="`Color: ${colorHex}`"
      />
    </ColorAreaRoot>

    <!-- N-channel slider rows: [label] [slider] -->
    <template
      v-for="ch in sliderChannels"
      :key="ch.key"
    >
      <Label
        :for="`slider-${ch.key}`"
        class="flex items-center justify-center text-sm font-medium"
      >{{ ch.label.charAt(0).toUpperCase() }}</Label>
      <ColorSliderRoot
        v-model="color"
        :color-space="colorSpace"
        :channel="ch.key"
        class="w-full"
        as="div"
      >
        <ColorSliderTrack
          as="div"
          class="relative h-5 overflow-hidden rounded-xl"
        >
          <ColorSliderCheckerboard />
          <ColorSliderGradient
            as="div"
            class="absolute inset-0 rounded-xl"
            :colors="getSliderColors(ch.key)"
            :channel-overrides="sliderOverrides[ch.key] ?? { alpha: 1 }"
          />
          <ColorSliderThumb
            :id="`slider-${ch.key}`"
            class="
              block size-5 rounded-full border-[2.5px] border-white bg-white
              shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
              focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
            "
            :aria-label="`${ch.label} slider, color: ${colorHex}`"
          />
        </ColorSliderTrack>
      </ColorSliderRoot>
    </template>

    <!-- Alpha slider row -->
    <Label
      for="slider-alpha"
      class="flex items-center justify-center text-sm font-medium"
    >A</Label>
    <ColorSliderRoot
      v-model="color"
      :color-space="colorSpace"
      channel="alpha"
      class="w-full"
      as="div"
    >
      <ColorSliderTrack
        as="div"
        class="relative h-5 overflow-hidden rounded-xl"
      >
        <ColorSliderCheckerboard />
        <ColorSliderGradient
          as="div"
          class="absolute inset-0 rounded-xl"
          :colors="getSliderColors('alpha')"
          :channel-overrides="alphaSliderOverrides"
        />
        <ColorSliderThumb
          id="slider-alpha"
          class="
            block size-6 rounded-full border-[2.5px] border-white bg-white
            shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
            outline-none
            focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
          "
          :aria-label="`Alpha slider, color: ${colorHex}`"
        />
      </ColorSliderTrack>
    </ColorSliderRoot>

    <!-- Fields row: [swatch] [hex field + N-channel fields] -->
    <div />

    <div
      class="flex flex-wrap items-end gap-2"
    >
      <div
        class="flex min-w-[100px] flex-1 flex-col gap-1"
      >
        <Label
          for="field-hex"
          class="text-xs font-semibold text-(--vp-c-text-2)"
        >Hex</Label>
        <ColorFieldRoot
          v-model="color"
          color-space="hex"
          channel="hex"
          format="hex"
          class="
            color-field-root flex items-center overflow-hidden rounded-md border
            border-(--vp-c-divider) bg-(--vp-c-bg)
          "
        >
          <ColorFieldInput
            id="field-hex"
            class="
              w-0 min-w-0 flex-1 border-none bg-transparent px-2 py-1 text-left
              font-mono text-[13px] text-(--vp-c-text-1) outline-none
            "
          />
        </ColorFieldRoot>
      </div>
      <div class="flex min-w-[100px] flex-1 flex-col gap-1">
        <Label
          for="field-alpha"
          class="text-xs font-semibold text-(--vp-c-text-2)"
        >A</Label>
        <ColorFieldRoot
          v-model="color"
          :color-space="colorSpace"
          channel="alpha"
          class="
            color-field-root flex items-center overflow-hidden rounded-md border
            border-(--vp-c-divider) bg-(--vp-c-bg)
          "
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
            id="field-alpha"
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
      <div
        v-for="ch in channels"
        :key="ch.key"
        class="flex min-w-[100px] flex-1 flex-col gap-1"
      >
        <Label
          :for="`field-${ch.key}`"
          class="text-xs font-semibold text-(--vp-c-text-2)"
        >{{ ch.label.charAt(0).toUpperCase() }}</Label>
        <ColorFieldRoot
          v-model="color"
          :color-space="colorSpace"
          :channel="ch.key"
          class="
            color-field-root flex items-center overflow-hidden rounded-md border
            border-(--vp-c-divider) bg-(--vp-c-bg)
          "
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
            :id="`field-${ch.key}`"
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

  <FullPreviewOverrides
    :color="color"
    :color-space="colorSpace"
    :channels="channels"
    :area-overrides="areaOverrides"
    :slider-overrides="sliderOverrides"
    :alpha-slider-overrides="alphaSliderOverrides"
    class="
      mt-4 hidden rounded-xl border border-(--vp-c-divider) bg-(--vp-c-bg-alt)
      p-6
      max-md:p-4
    "
    @update:area-overrides="areaOverrides = $event"
    @update:slider-overrides="sliderOverrides = $event"
    @update:alpha-slider-overrides="alphaSliderOverrides = $event"
  />
</template>

<!-- Unscoped: portal-rendered elements (teleported outside component tree) -->
<style>
.select-content {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  padding: 4px;
}

.tooltip-content {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  color: var(--vp-c-text-1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 100;
  animation: tooltipFadeIn 0.15s ease-out;
}

@keyframes tooltipFadeIn {
  from { opacity: 0; transform: translateY(2px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>

<!-- Scoped: all component-local styles -->
<style scoped>
/* ToggleGroup / Toggle: brand color on selected state */
button[data-state="on"],
button[data-active] {
  background: var(--vp-c-brand-1, #3451b2) !important;
  color: var(--vp-button-brand-text, #fff) !important;
  border-color: var(--vp-c-brand-1, #3451b2) !important;
}

/* Select trigger: outline on focus */
button[data-state="open"],
button[data-state="closed"]:focus-visible {
  outline: 2px solid var(--vp-c-brand-1, #3451b2);
  outline-offset: -1px;
}

/* ColorField: fixed height and padding */
.color-field-root {
  height: 32px;
}
.color-field-root input {
  height: 100%;
  padding: 4px 8px;
  box-sizing: border-box;
}

/* Color swatch: diagonal split — opaque triangle over alpha+checkerboard */
.color-swatch::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--swatch-color-opaque);
  clip-path: polygon(0 0, 100% 0, 0 100%);
}
</style>

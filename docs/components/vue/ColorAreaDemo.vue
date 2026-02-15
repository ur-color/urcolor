<script setup lang="ts">
import { ref, shallowRef, computed, triggerRef, watch } from "vue";
import { usePreferredLanguages } from "@vueuse/core";
import "internationalized-color/css";
import { Color, useLocale, nameColor } from "internationalized-color";
import * as allLocales from "internationalized-color/locales";

const localeOptions = [
  { code: "aa", flag: "🇪🇹", label: "AA" },
  { code: "ab", flag: "🇬🇪", label: "AB" },
  { code: "af", flag: "🇿🇦", label: "AF" },
  { code: "ak", flag: "🇬🇭", label: "AK" },
  { code: "am", flag: "🇪🇹", label: "AM" },
  { code: "ar", flag: "🇸🇦", label: "AR" },
  { code: "az", flag: "🇦🇿", label: "AZ" },
  { code: "bg", flag: "🇧🇬", label: "BG" },
  { code: "bn", flag: "🇧🇩", label: "BN" },
  { code: "ca", flag: "🇪🇸", label: "CA" },
  { code: "cr", flag: "🇨🇦", label: "CR" },
  { code: "cs", flag: "🇨🇿", label: "CS" },
  { code: "cy", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", label: "CY" },
  { code: "da", flag: "🇩🇰", label: "DA" },
  { code: "de", flag: "🇩🇪", label: "DE" },
  { code: "el", flag: "🇬🇷", label: "EL" },
  { code: "en", flag: "🇬🇧", label: "EN" },
  { code: "es", flag: "🇪🇸", label: "ES" },
  { code: "et", flag: "🇪🇪", label: "ET" },
  { code: "fa", flag: "🇮🇷", label: "FA" },
  { code: "fi", flag: "🇫🇮", label: "FI" },
  { code: "fr", flag: "🇫🇷", label: "FR" },
  { code: "ga", flag: "🇮🇪", label: "GA" },
  { code: "gu", flag: "🇮🇳", label: "GU" },
  { code: "he", flag: "🇮🇱", label: "HE" },
  { code: "hi", flag: "🇮🇳", label: "HI" },
  { code: "hr", flag: "🇭🇷", label: "HR" },
  { code: "hu", flag: "🇭🇺", label: "HU" },
  { code: "id", flag: "🇮🇩", label: "ID" },
  { code: "is", flag: "🇮🇸", label: "IS" },
  { code: "it", flag: "🇮🇹", label: "IT" },
  { code: "ja", flag: "🇯🇵", label: "JA" },
  { code: "ka", flag: "🇬🇪", label: "KA" },
  { code: "kn", flag: "🇮🇳", label: "KN" },
  { code: "ko", flag: "🇰🇷", label: "KO" },
  { code: "lb", flag: "🇱🇺", label: "LB" },
  { code: "lt", flag: "🇱🇹", label: "LT" },
  { code: "lv", flag: "🇱🇻", label: "LV" },
  { code: "mk", flag: "🇲🇰", label: "MK" },
  { code: "ml", flag: "🇮🇳", label: "ML" },
  { code: "ms", flag: "🇲🇾", label: "MS" },
  { code: "my", flag: "🇲🇲", label: "MY" },
  { code: "na", flag: "🇳🇷", label: "NA" },
  { code: "nb", flag: "🇳🇴", label: "NB" },
  { code: "ne", flag: "🇳🇵", label: "NE" },
  { code: "nl", flag: "🇳🇱", label: "NL" },
  { code: "nn", flag: "🇳🇴", label: "NN" },
  { code: "no", flag: "🇳🇴", label: "NO" },
  { code: "ny", flag: "🇲🇼", label: "NY" },
  { code: "oc", flag: "🇫🇷", label: "OC" },
  { code: "pa", flag: "🇮🇳", label: "PA" },
  { code: "pl", flag: "🇵🇱", label: "PL" },
  { code: "ps", flag: "🇦🇫", label: "PS" },
  { code: "pt", flag: "🇵🇹", label: "PT" },
  { code: "ro", flag: "🇷🇴", label: "RO" },
  { code: "ru", flag: "🇷🇺", label: "RU" },
  { code: "si", flag: "🇱🇰", label: "SI" },
  { code: "sk", flag: "🇸🇰", label: "SK" },
  { code: "sl", flag: "🇸🇮", label: "SL" },
  { code: "sm", flag: "🇼🇸", label: "SM" },
  { code: "so", flag: "🇸🇴", label: "SO" },
  { code: "sq", flag: "🇦🇱", label: "SQ" },
  { code: "sr", flag: "🇷🇸", label: "SR" },
  { code: "su", flag: "🇮🇩", label: "SU" },
  { code: "sv", flag: "🇸🇪", label: "SV" },
  { code: "ta", flag: "🇮🇳", label: "TA" },
  { code: "te", flag: "🇮🇳", label: "TE" },
  { code: "th", flag: "🇹🇭", label: "TH" },
  { code: "tl", flag: "🇵🇭", label: "TL" },
  { code: "tr", flag: "🇹🇷", label: "TR" },
  { code: "uk", flag: "🇺🇦", label: "UK" },
  { code: "ur", flag: "🇵🇰", label: "UR" },
  { code: "vi", flag: "🇻🇳", label: "VI" },
  { code: "zh", flag: "🇨🇳", label: "ZH" },
  { code: "ja_traditional", flag: "🇯🇵", label: "JA-T" },
  { code: "zh_traditional", flag: "🇨🇳", label: "ZH-T" },
  { code: "ko_traditional", flag: "🇰🇷", label: "KO-T" },
] as const;

// RTL locales
const rtlLocales = new Set(["ar", "fa", "he", "ps", "ur"]);

// Register all locales
Object.values(allLocales).forEach(useLocale);

// Detect browser language and match to available locales
const browserLanguages = usePreferredLanguages();
const defaultLocale = computed(() => {
  for (const lang of browserLanguages.value) {
    const code = lang.split("-")[0].toLowerCase();
    if (localeOptions.some((l) => l.code === code)) return code;
  }
  return "en";
});

const selectedLocale = ref(defaultLocale.value);
import { colorSpaces, getChannelConfig, culoriToDisplay } from "@urcolor/core";
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
} from "reka-ui";
import { Icon } from "@iconify/vue";
import {
  ColorAreaRoot,
  ColorAreaTrack,
  ColorAreaGradient,
  ColorAreaThumb,
  ColorAreaThumbX,
  ColorAreaThumbY,
} from "../../../packages/vue/src/components/ColorArea";
import {
  ColorSliderRoot,
  ColorSliderTrack,
  ColorSliderGradient,
  ColorSliderThumb,
} from "../../../packages/vue/src/components/ColorSlider";
import {
  ColorFieldRoot,
  ColorFieldInput,
  ColorFieldIncrement,
  ColorFieldDecrement,
  ColorFieldSwatch,
} from "../../../packages/vue/src/components/ColorField";

const colorSpace = ref("hsv");
const invertedX = ref(false);
const invertedY = ref(false);

const color = shallowRef<Color>(Color.parse("hsl(0, 100%, 50%)")!);

const spaceConfig = computed(() => colorSpaces[colorSpace.value]);
const channels = computed(() => spaceConfig.value?.channels ?? []);

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
    const other = channels.value.find((ch) => ch.key !== val);
    if (other) selectedYChannel.value = other.key;
  }
});
watch(selectedYChannel, (val) => {
  if (val === selectedXChannel.value) {
    const other = channels.value.find((ch) => ch.key !== val);
    if (other) selectedXChannel.value = other.key;
  }
});

const xChannel = computed(() => selectedXChannel.value);
const yChannel = computed(() => selectedYChannel.value);
// The remaining channel(s) become sliders
const sliderChannels = computed(() => channels.value);

// Base color for channel-based gradient rendering
const gradientBaseColor = computed(() => color.value.toString());

// Generate slider gradient colors for each slider channel
function getSliderColors(channelKey: string): string[] {
  const cfg = getChannelConfig(colorSpace.value, channelKey);
  if (!cfg) return ["black", "white"];
  const steps = 7;
  const colors: string[] = [];
  const cMin = cfg.culoriMin ?? cfg.min;
  const cMax = cfg.culoriMax ?? cfg.max;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const val = cMin + t * (cMax - cMin);
    colors.push(color.value.set({ mode: colorSpace.value, [channelKey]: val }).toString());
  }
  return colors;
}

const selectedColorCss = computed(() => {
  return color.value.toHex() ?? "black";
});

function onColorUpdate(c: Color | undefined) {
  if (c) {
    color.value = c;
    triggerRef(color);
  }
}

const colorName = computed(() => {
  const result = nameColor(color.value, selectedLocale.value);
  return result?.name ?? "";
});

const currentLocaleOption = computed(() =>
  localeOptions.find((l) => l.code === selectedLocale.value) ?? localeOptions[0]
);

const spaceKeys = Object.keys(colorSpaces);
</script>

<template>
  <div class="demo-grid">
    <!-- Row 1: [empty] [X channel + invert ... color space selector] -->
    <div class="col-left"></div>
    <div class="row-x">
      <div class="channel-toggle-row">
        <Label id="label-x" class="select-label" @click="($refs.toggleGroupX as HTMLElement)?.querySelector('button:not(:disabled)')?.focus()">X</Label>
        <ToggleGroupRoot ref="toggleGroupX" v-model="selectedXChannel" type="single" class="toggle-group" aria-labelledby="label-x">
          <ToggleGroupItem
            v-for="ch in channels"
            :key="ch.key"
            :value="ch.key"
            :disabled="ch.key === selectedYChannel"
            class="toggle-item"
          >
            {{ ch.label.charAt(0).toUpperCase() }}
          </ToggleGroupItem>
        </ToggleGroupRoot>
        <Toggle v-model="invertedX" class="toggle-btn">I</Toggle>
      </div>
      <div class="row-x-right">
        <code class="color-name" :dir="rtlLocales.has(selectedLocale) ? 'rtl' : 'ltr'">{{ colorName }}</code>
        <SelectRoot v-model="selectedLocale">
          <SelectTrigger class="select-trigger select-trigger-locale" aria-label="Language">
            <span>{{ currentLocaleOption.flag }} {{ currentLocaleOption.label }}</span>
            <SelectIcon class="select-icon">
              <Icon icon="lucide:chevron-down" />
            </SelectIcon>
          </SelectTrigger>
          <SelectPortal>
          <SelectContent class="select-content" position="popper" :side-offset="4" :body-lock="false">
            <SelectViewport class="select-viewport">
              <SelectItem
                v-for="loc in localeOptions"
                :key="loc.code"
                :value="loc.code"
                class="select-item"
              >
                <SelectItemText>{{ loc.flag }} {{ loc.label }}</SelectItemText>
              </SelectItem>
            </SelectViewport>
          </SelectContent>
          </SelectPortal>
        </SelectRoot>
        <SelectRoot v-model="colorSpace">
          <SelectTrigger class="select-trigger" aria-label="Color space">
            <SelectValue placeholder="Select space" />
            <SelectIcon class="select-icon">
              <Icon icon="lucide:chevron-down" />
            </SelectIcon>
          </SelectTrigger>
          <SelectPortal>
          <SelectContent class="select-content" position="popper" :side-offset="4" :body-lock="false">
            <SelectViewport class="select-viewport">
              <SelectItem
                v-for="key in spaceKeys"
                :key="key"
                :value="key"
                class="select-item"
              >
                <SelectItemText>{{ colorSpaces[key].label }}</SelectItemText>
              </SelectItem>
            </SelectViewport>
          </SelectContent>
          </SelectPortal>
        </SelectRoot>
      </div>
    </div>

    <!-- Row 2: [Y channel vertical] [ColorArea] -->
    <div class="col-left channel-toggle-col">
      <Label id="label-y" class="select-label" @click="($refs.toggleGroupY as HTMLElement)?.querySelector('button:not(:disabled)')?.focus()">Y</Label>
      <ToggleGroupRoot ref="toggleGroupY" v-model="selectedYChannel" type="single" orientation="vertical" class="toggle-group toggle-group-vertical" aria-labelledby="label-y">
        <ToggleGroupItem
          v-for="ch in channels"
          :key="ch.key"
          :value="ch.key"
          :disabled="ch.key === selectedXChannel"
          class="toggle-item"
        >
          {{ ch.label.charAt(0).toUpperCase() }}
        </ToggleGroupItem>
      </ToggleGroupRoot>
      <Toggle v-model="invertedY" class="toggle-btn">I</Toggle>
    </div>
    <ColorAreaRoot
      :model-value="color"
      :color-space="colorSpace"
      :x-channel="xChannel"
      :y-channel="yChannel"
      :inverted-x="invertedX"
      :inverted-y="invertedY"
      as="div"
      class="area-root"
      :aria-label="`Color picker, selected: ${colorName}`"
      @update:model-value="onColorUpdate"
    >
      <ColorAreaTrack as="div" class="area-track">
        <ColorAreaGradient
          as="div"
          class="area-gradient"
          :base-color="gradientBaseColor"
          :color-space="colorSpace"
          :x-channel="xChannel"
          :y-channel="yChannel"
        />
        <ColorAreaThumb as="div" class="area-thumb-group">
          <ColorAreaThumbX as="div" class="area-thumb" :aria-label="`Color: ${colorName}`" />
          <ColorAreaThumbY as="div" class="area-thumb-y" />
        </ColorAreaThumb>
      </ColorAreaTrack>
    </ColorAreaRoot>

    <!-- N-channel slider rows: [label] [slider] -->
    <template v-for="ch in sliderChannels" :key="ch.key">
      <Label :for="`slider-${ch.key}`" class="col-left slider-label-text">{{ ch.label.charAt(0).toUpperCase() }}</Label>
      <ColorSliderRoot
        :model-value="color"
        :color-space="colorSpace"
        :channel="ch.key"
        class="slider-root"
        as="div"
        @update:model-value="onColorUpdate"
      >
        <ColorSliderTrack as="div" class="slider-track">
          <ColorSliderGradient as="div" class="slider-gradient" :colors="getSliderColors(ch.key)" />
          <ColorSliderThumb :id="`slider-${ch.key}`" class="slider-thumb" :aria-label="`${ch.label} slider, color: ${colorName}`" />
        </ColorSliderTrack>
      </ColorSliderRoot>
    </template>

    <!-- Last row: [swatch] [hex field + N-channel fields] -->
    <ColorFieldSwatch :color="selectedColorCss" class="col-left color-swatch" :aria-label="`Selected color: ${colorName}`" />
    <div class="row-fields">
      <div class="channel-field">
        <Label for="field-hex" class="channel-label">Hex</Label>
        <ColorFieldRoot
          :model-value="color"
          color-space="hex"
          channel="hex"
          format="hex"
          class="field-root"
          @update:model-value="onColorUpdate"
        >
          <ColorFieldInput id="field-hex" class="field-input field-input-hex" />
        </ColorFieldRoot>
      </div>
      <div v-for="ch in channels" :key="ch.key" class="channel-field">
        <Label :for="`field-${ch.key}`" class="channel-label">{{ ch.label.charAt(0).toUpperCase() }}</Label>
        <ColorFieldRoot
          :model-value="color"
          :color-space="colorSpace"
          :channel="ch.key"
          class="field-root"
          @update:model-value="onColorUpdate"
        >
          <ColorFieldDecrement class="field-btn">&minus;</ColorFieldDecrement>
          <ColorFieldInput :id="`field-${ch.key}`" class="field-input" />
          <ColorFieldIncrement class="field-btn">+</ColorFieldIncrement>
        </ColorFieldRoot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.demo-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
  padding: 24px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-alt);
}

.col-left {
  display: flex;
  justify-content: center;
  align-items: center;
}

.row-x {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.channel-toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.row-x-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.select-trigger-locale {
  max-width: 92px;
  padding: 6px 8px;
  gap: 2px;
}

.color-name {
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-brand-1, #3451b2);
  background: var(--vp-c-bg);
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  white-space: nowrap;
  height: 32px;
  box-sizing: border-box;
}

.channel-toggle-col {
  flex-direction: column;
  gap: 8px;
  align-self: start;
}

.toggle-group-vertical {
  flex-direction: column;
}

.toggle-group-vertical .toggle-item {
  border-right: none;
  border-bottom: 1px solid var(--vp-c-divider);
}

.toggle-group-vertical .toggle-item:last-child {
  border-bottom: none;
}

/* Slider rows */
.slider-label-text {
  font-size: 14px;
  font-weight: 500;
}

.slider-root {
  width: 100%;
}

.slider-track {
  position: relative;
  height: 16px;
  border-radius: 8px;
  overflow: hidden;
}

.slider-gradient {
  position: absolute;
  inset: 0;
  border-radius: 8px;
}

.slider-thumb {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  border: 2px solid white;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.3);
  outline: none;
}

.slider-thumb:focus-visible {
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3), 0 0 0 3px rgba(66, 153, 225, 0.6);
}

/* Last row */
.row-fields {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.color-swatch {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background-color: var(--color-field-swatch);
  align-self: flex-end;
}

.hex-code {
  font-size: 13px;
  font-family: var(--vp-font-family-mono);
}

.channel-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.channel-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.field-root {
  display: flex;
  align-items: center;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow: hidden;
  background: var(--vp-c-bg);
}

.field-input {
  flex: 1;
  min-width: 0;
  width: 0;
  padding: 4px 2px;
  border: none;
  background: transparent;
  text-align: center;
  font-size: 13px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-1);
  outline: none;
}

.field-input-hex {
  text-align: left;
  padding-left: 8px;
}

.field-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  user-select: none;
  flex-shrink: 0;
}

.field-btn:first-child {
  border-right: 1px solid var(--vp-c-divider);
}

.field-btn:last-child {
  border-left: 1px solid var(--vp-c-divider);
}

.field-btn:hover:not(:disabled) {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.field-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

/* Shared component styles */
.select-label {
  font-size: 14px;
  font-weight: 500;
}

.select-icon {
  width: 14px;
  height: 14px;
  color: var(--vp-c-text-2);
  flex-shrink: 0;
}

.select-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
  cursor: pointer;
  width: 120px;
  justify-content: space-between;
  flex-shrink: 0;
}

.toggle-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  color: var(--vp-c-text-2);
}

.toggle-btn[data-state="on"] {
  background: var(--vp-c-brand-1, #3451b2);
  color: var(--vp-button-brand-text, #fff);
  border-color: var(--vp-c-brand-1, #3451b2);
}

.toggle-group {
  display: inline-flex;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow: hidden;
}

.toggle-item {
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-right: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  color: var(--vp-c-text-2);
}

.toggle-item:last-child {
  border-right: none;
}

.toggle-item[data-state="on"] {
  background: var(--vp-c-brand-1, #3451b2);
  color: var(--vp-button-brand-text, #fff);
}

.toggle-item:disabled {
  color: var(--vp-c-text-3, #8e8e93);
  text-decoration: line-through;
  background: var(--vp-c-bg-alt);
  cursor: default;
}

.area-root {
  display: block;
  align-self: start;
}

.area-track {
  position: relative;
  width: 100%;
  height: 200px;
  border-radius: 8px;
  overflow: clip;
  cursor: crosshair;
  touch-action: none;
}

.area-gradient {
  position: absolute;
  inset: 0;
}

.area-thumb-group {
  position: absolute;
  width: 20px;
  height: 20px;
  transform: var(--reka-slider-area-thumb-transform);
}

.area-thumb,
.area-thumb-y {
  position: absolute;
  inset: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.3);
  outline: none;
}

.area-thumb-y {
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

.area-thumb:focus-visible {
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3), 0 0 0 3px rgba(66, 153, 225, 0.6);
}
</style>

<style>
.select-content {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  overflow: hidden;
}

.select-viewport {
  padding: 4px;
}

.select-item {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  outline: none;
}

.select-item:hover,
.select-item[data-highlighted] {
  background: var(--vp-c-bg-soft);
}

.select-item[data-state="checked"] {
  font-weight: 600;
}
</style>

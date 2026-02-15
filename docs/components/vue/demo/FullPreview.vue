<script setup lang="ts">
import { ref, shallowRef, computed, watch } from "vue";
import { usePreferredLanguages } from "@vueuse/core";
import "internationalized-color/css";
import { Color, useLocale, nameColor } from "internationalized-color";
import * as allLocales from "internationalized-color/locales";

const localeOptions = [
  { code: "aa", flag: "\u{1F1EA}\u{1F1F9}", label: "AA" },
  { code: "ab", flag: "\u{1F1EC}\u{1F1EA}", label: "AB" },
  { code: "af", flag: "\u{1F1FF}\u{1F1E6}", label: "AF" },
  { code: "ak", flag: "\u{1F1EC}\u{1F1ED}", label: "AK" },
  { code: "am", flag: "\u{1F1EA}\u{1F1F9}", label: "AM" },
  { code: "ar", flag: "\u{1F1F8}\u{1F1E6}", label: "AR" },
  { code: "az", flag: "\u{1F1E6}\u{1F1FF}", label: "AZ" },
  { code: "bg", flag: "\u{1F1E7}\u{1F1EC}", label: "BG" },
  { code: "bn", flag: "\u{1F1E7}\u{1F1E9}", label: "BN" },
  { code: "ca", flag: "\u{1F1EA}\u{1F1F8}", label: "CA" },
  { code: "cr", flag: "\u{1F1E8}\u{1F1E6}", label: "CR" },
  { code: "cs", flag: "\u{1F1E8}\u{1F1FF}", label: "CS" },
  { code: "cy", flag: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}", label: "CY" },
  { code: "da", flag: "\u{1F1E9}\u{1F1F0}", label: "DA" },
  { code: "de", flag: "\u{1F1E9}\u{1F1EA}", label: "DE" },
  { code: "el", flag: "\u{1F1EC}\u{1F1F7}", label: "EL" },
  { code: "en", flag: "\u{1F1EC}\u{1F1E7}", label: "EN" },
  { code: "es", flag: "\u{1F1EA}\u{1F1F8}", label: "ES" },
  { code: "et", flag: "\u{1F1EA}\u{1F1EA}", label: "ET" },
  { code: "fa", flag: "\u{1F1EE}\u{1F1F7}", label: "FA" },
  { code: "fi", flag: "\u{1F1EB}\u{1F1EE}", label: "FI" },
  { code: "fr", flag: "\u{1F1EB}\u{1F1F7}", label: "FR" },
  { code: "ga", flag: "\u{1F1EE}\u{1F1EA}", label: "GA" },
  { code: "gu", flag: "\u{1F1EE}\u{1F1F3}", label: "GU" },
  { code: "he", flag: "\u{1F1EE}\u{1F1F1}", label: "HE" },
  { code: "hi", flag: "\u{1F1EE}\u{1F1F3}", label: "HI" },
  { code: "hr", flag: "\u{1F1ED}\u{1F1F7}", label: "HR" },
  { code: "hu", flag: "\u{1F1ED}\u{1F1FA}", label: "HU" },
  { code: "id", flag: "\u{1F1EE}\u{1F1E9}", label: "ID" },
  { code: "is", flag: "\u{1F1EE}\u{1F1F8}", label: "IS" },
  { code: "it", flag: "\u{1F1EE}\u{1F1F9}", label: "IT" },
  { code: "ja", flag: "\u{1F1EF}\u{1F1F5}", label: "JA" },
  { code: "ka", flag: "\u{1F1EC}\u{1F1EA}", label: "KA" },
  { code: "kn", flag: "\u{1F1EE}\u{1F1F3}", label: "KN" },
  { code: "ko", flag: "\u{1F1F0}\u{1F1F7}", label: "KO" },
  { code: "lb", flag: "\u{1F1F1}\u{1F1FA}", label: "LB" },
  { code: "lt", flag: "\u{1F1F1}\u{1F1F9}", label: "LT" },
  { code: "lv", flag: "\u{1F1F1}\u{1F1FB}", label: "LV" },
  { code: "mk", flag: "\u{1F1F2}\u{1F1F0}", label: "MK" },
  { code: "ml", flag: "\u{1F1EE}\u{1F1F3}", label: "ML" },
  { code: "ms", flag: "\u{1F1F2}\u{1F1FE}", label: "MS" },
  { code: "my", flag: "\u{1F1F2}\u{1F1F2}", label: "MY" },
  { code: "na", flag: "\u{1F1F3}\u{1F1F7}", label: "NA" },
  { code: "nb", flag: "\u{1F1F3}\u{1F1F4}", label: "NB" },
  { code: "ne", flag: "\u{1F1F3}\u{1F1F5}", label: "NE" },
  { code: "nl", flag: "\u{1F1F3}\u{1F1F1}", label: "NL" },
  { code: "nn", flag: "\u{1F1F3}\u{1F1F4}", label: "NN" },
  { code: "no", flag: "\u{1F1F3}\u{1F1F4}", label: "NO" },
  { code: "ny", flag: "\u{1F1F2}\u{1F1FC}", label: "NY" },
  { code: "oc", flag: "\u{1F1EB}\u{1F1F7}", label: "OC" },
  { code: "pa", flag: "\u{1F1EE}\u{1F1F3}", label: "PA" },
  { code: "pl", flag: "\u{1F1F5}\u{1F1F1}", label: "PL" },
  { code: "ps", flag: "\u{1F1E6}\u{1F1EB}", label: "PS" },
  { code: "pt", flag: "\u{1F1F5}\u{1F1F9}", label: "PT" },
  { code: "ro", flag: "\u{1F1F7}\u{1F1F4}", label: "RO" },
  { code: "ru", flag: "\u{1F1F7}\u{1F1FA}", label: "RU" },
  { code: "si", flag: "\u{1F1F1}\u{1F1F0}", label: "SI" },
  { code: "sk", flag: "\u{1F1F8}\u{1F1F0}", label: "SK" },
  { code: "sl", flag: "\u{1F1F8}\u{1F1EE}", label: "SL" },
  { code: "sm", flag: "\u{1F1FC}\u{1F1F8}", label: "SM" },
  { code: "so", flag: "\u{1F1F8}\u{1F1F4}", label: "SO" },
  { code: "sq", flag: "\u{1F1E6}\u{1F1F1}", label: "SQ" },
  { code: "sr", flag: "\u{1F1F7}\u{1F1F8}", label: "SR" },
  { code: "su", flag: "\u{1F1EE}\u{1F1E9}", label: "SU" },
  { code: "sv", flag: "\u{1F1F8}\u{1F1EA}", label: "SV" },
  { code: "ta", flag: "\u{1F1EE}\u{1F1F3}", label: "TA" },
  { code: "te", flag: "\u{1F1EE}\u{1F1F3}", label: "TE" },
  { code: "th", flag: "\u{1F1F9}\u{1F1ED}", label: "TH" },
  { code: "tl", flag: "\u{1F1F5}\u{1F1ED}", label: "TL" },
  { code: "tr", flag: "\u{1F1F9}\u{1F1F7}", label: "TR" },
  { code: "uk", flag: "\u{1F1FA}\u{1F1E6}", label: "UK" },
  { code: "ur", flag: "\u{1F1F5}\u{1F1F0}", label: "UR" },
  { code: "vi", flag: "\u{1F1FB}\u{1F1F3}", label: "VI" },
  { code: "zh", flag: "\u{1F1E8}\u{1F1F3}", label: "ZH" },
  { code: "ja_traditional", flag: "\u{1F1EF}\u{1F1F5}", label: "JA-T" },
  { code: "zh_traditional", flag: "\u{1F1E8}\u{1F1F3}", label: "ZH-T" },
  { code: "ko_traditional", flag: "\u{1F1F0}\u{1F1F7}", label: "KO-T" },
] as const;

// RTL locales
const rtlLocales = new Set(["ar", "fa", "he", "ps", "ur"]);

// Register all locales
Object.values(allLocales).forEach(useLocale);

// Detect browser language and match to available locales
const browserLanguages = usePreferredLanguages();
const defaultLocale = computed(() => {
  for (const lang of browserLanguages.value) {
    const code = lang?.split("-")[0]?.toLowerCase();
    if (code && localeOptions.some(l => l.code === code)) return code;
  }
  return "en";
});

const selectedLocale = ref(defaultLocale.value);
import { colorSpaces, getChannelConfig } from "@urcolor/core";
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
import {
  ColorAreaRoot,
  ColorAreaTrack,
  ColorAreaGradient,
  ColorAreaCheckerboard,
  ColorAreaThumb,
  ColorAreaThumbX,
  ColorAreaThumbY,
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
} from "@urcolor/vue";

const colorSpace = ref("hsv");
const invertedX = ref(false);
const invertedY = ref(false);

const color = shallowRef<Color>(Color.parse("hsl(0, 100%, 50%)")!);

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
      colors.push(color.value.set({ alpha: t }).toString() ?? "transparent");
    }
    return colors;
  }
  const cfg = getChannelConfig(colorSpace.value, channelKey);
  if (!cfg) return ["black", "white"];
  const steps = 7;
  const colors: string[] = [];
  const cMin = cfg.culoriMin ?? cfg.min;
  const cMax = cfg.culoriMax ?? cfg.max;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const val = cMin + t * (cMax - cMin);
    colors.push(color.value.set({ mode: colorSpace.value, [channelKey]: val }).toString() ?? "black");
  }
  return colors;
}

const selectedColorCss = computed(() => {
  return color.value.toHex() ?? "black";
});

function onColorUpdate(c: Color | undefined) {
  if (c) {
    color.value = c;
  }
}

const colorName = computed(() => {
  const result = nameColor(color.value, selectedLocale.value);
  return result?.name ?? "";
});

const currentLocaleOption = computed(() =>
  localeOptions.find(l => l.code === selectedLocale.value) ?? localeOptions[0],
);

const spaceKeys = Object.keys(colorSpaces);
</script>

<template>
  <div
    class="
      preview-grid grid grid-cols-[auto_1fr] items-center gap-3 rounded-lg
      border border-(--vp-c-divider) bg-(--vp-c-bg-alt) p-6
      max-md:p-4
    "
  >
    <!-- Mobile-only top row: color name, language, color space -->
    <div
      class="
        hidden items-center gap-2 col-span-2 flex-wrap
        max-md:flex
      "
    >
      <code
        class="
          box-border inline-flex h-8 items-center rounded-md border
          border-(--vp-c-divider) bg-(--vp-c-bg) px-3 py-1.5 font-mono
          text-[13px] whitespace-nowrap text-(--vp-c-brand-1,#3451b2)
        "
        :dir="rtlLocales.has(selectedLocale) ? 'rtl' : 'ltr'"
      >{{ colorName }}</code>
      <div class="flex items-center gap-2 ml-auto">
        <SelectRoot v-model="selectedLocale">
          <SelectTrigger
            class="
              box-border inline-flex h-8 max-w-[92px] shrink-0 cursor-pointer
              items-center justify-between gap-0.5 overflow-hidden rounded-md
              border! border-(--vp-c-divider)! bg-(--vp-c-bg) px-2! py-1
              text-[13px]
            "
            aria-label="Language"
          >
            <SelectValue>{{ currentLocaleOption.flag }} {{ currentLocaleOption.label }}</SelectValue>
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
                  v-for="loc in localeOptions"
                  :key="loc.code"
                  :value="loc.code"
                  class="
                    cursor-pointer rounded-md px-2.5 py-1.5 text-[13px]
                    outline-none
                    hover:bg-(--vp-c-bg-soft)
                    data-highlighted:bg-(--vp-c-bg-soft)
                    data-[state=checked]:font-semibold
                  "
                >
                  <SelectItemText>{{ loc.flag }} {{ loc.label }}</SelectItemText>
                </SelectItem>
              </SelectViewport>
            </SelectContent>
          </SelectPortal>
        </SelectRoot>
        <SelectRoot v-model="colorSpace">
          <SelectTrigger
            class="
              box-border inline-flex h-8 w-[120px] shrink-0 cursor-pointer
              items-center justify-between gap-1 overflow-hidden rounded-md
              border! border-(--vp-c-divider)! bg-(--vp-c-bg) px-2! py-1
              text-[13px]
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

    <!-- Row 1 (desktop) / Row 2 (mobile): [XY svg] [X channel + invert ... color name/lang/space] -->
    <div class="flex items-center justify-center">
      <span class="text-sm text-(--vp-c-text-2)">
        <svg
          width="34"
          height="34"
          viewBox="0 0 34 34"
          style="display:inline-block;vertical-align:middle;"
        >
          <line
            x1="4"
            y1="4"
            x2="30"
            y2="30"
            stroke="currentColor"
            style="opacity: 0.25;"
            stroke-width="1.5"
          />
          <text
            x="7.5"
            y="27"
            font-size="12"
            text-anchor="middle"
            dominant-baseline="middle"
            fill="currentColor"
            font-family="inherit"
          >Y</text>
          <text
            x="26"
            y="13"
            font-size="12"
            text-anchor="middle"
            dominant-baseline="middle"
            fill="currentColor"
            font-family="inherit"
          >X</text>
        </svg>
      </span>
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
                    border-r-(--vp-c-divider) bg-(--vp-c-bg) p-0 text-[13px]
                    font-medium text-(--vp-c-text-2)
                    last:border-r-0
                    disabled:cursor-default disabled:bg-(--vp-c-bg-alt)
                    disabled:text-(--vp-c-text-3,#8e8e93) disabled:line-through
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
                  size-8 cursor-pointer rounded-md border
                  border-(--vp-c-divider) bg-(--vp-c-bg) text-[13px] font-medium
                  text-(--vp-c-text-2)
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
      <div class="flex shrink-0 items-center gap-2 max-md:hidden">
        <code
          class="
            box-border inline-flex h-8 items-center rounded-md border
            border-(--vp-c-divider) bg-(--vp-c-bg) px-3 py-1.5 font-mono
            text-[13px] whitespace-nowrap text-(--vp-c-brand-1,#3451b2)
          "
          :dir="rtlLocales.has(selectedLocale) ? 'rtl' : 'ltr'"
        >{{ colorName }}</code>
        <SelectRoot v-model="selectedLocale">
          <SelectTrigger
            class="
              box-border inline-flex h-8 max-w-[92px] shrink-0 cursor-pointer
              items-center justify-between gap-0.5 overflow-hidden rounded-md
              border! border-(--vp-c-divider)! bg-(--vp-c-bg) px-2! py-1
              text-[13px]
            "
            aria-label="Language"
          >
            <SelectValue>{{ currentLocaleOption.flag }} {{ currentLocaleOption.label }}</SelectValue>
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
                  v-for="loc in localeOptions"
                  :key="loc.code"
                  :value="loc.code"
                  class="
                    cursor-pointer rounded-md px-2.5 py-1.5 text-[13px]
                    outline-none
                    hover:bg-(--vp-c-bg-soft)
                    data-highlighted:bg-(--vp-c-bg-soft)
                    data-[state=checked]:font-semibold
                  "
                >
                  <SelectItemText>{{ loc.flag }} {{ loc.label }}</SelectItemText>
                </SelectItem>
              </SelectViewport>
            </SelectContent>
          </SelectPortal>
        </SelectRoot>
        <SelectRoot v-model="colorSpace">
          <SelectTrigger
            class="
              box-border inline-flex h-8 w-[120px] shrink-0 cursor-pointer
              items-center justify-between gap-1 overflow-hidden rounded-md
              border! border-(--vp-c-divider)! bg-(--vp-c-bg) px-2! py-1
              text-[13px]
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
                  border-b-(--vp-c-divider) bg-(--vp-c-bg) p-0 text-[13px]
                  font-medium text-(--vp-c-text-2)
                  last:border-b-0
                  disabled:cursor-default disabled:bg-(--vp-c-bg-alt)
                  disabled:text-(--vp-c-text-3,#8e8e93) disabled:line-through
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
                size-8 cursor-pointer rounded-md border border-(--vp-c-divider)
                bg-(--vp-c-bg) text-[13px] font-medium text-(--vp-c-text-2)
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
      :model-value="color"
      :color-space="colorSpace"
      :channel-x="xChannel"
      :channel-y="yChannel"
      :inverted-x="invertedX"
      :inverted-y="invertedY"
      as="div"
      alpha
      class="block self-start"
      :aria-label="`Color picker, selected: ${colorName}`"
      @update:model-value="onColorUpdate"
    >
      <ColorAreaTrack
        as="div"
        class="
          relative h-[200px] w-full cursor-crosshair touch-none overflow-clip
          rounded-lg
        "
      >
        <ColorAreaCheckerboard />
        <ColorAreaGradient
          as="div"
          class="absolute inset-0"
        />
        <ColorAreaThumb
          as="div"
          class="absolute size-5 transform-(--reka-slider-area-thumb-transform)"
        >
          <ColorAreaThumbX
            as="div"
            class="
              absolute inset-0 size-5 rounded-full border-2 border-white
              shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
              outline-none
              focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
            "
            :aria-label="`Color: ${colorName}`"
          />
          <ColorAreaThumbY
            as="div"
            class="pointer-events-none size-0 opacity-0"
          />
        </ColorAreaThumb>
      </ColorAreaTrack>
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
        :model-value="color"
        :color-space="colorSpace"
        :channel="ch.key"
        class="w-full"
        as="div"
        @update:model-value="onColorUpdate"
      >
        <ColorSliderTrack
          as="div"
          class="relative h-6 overflow-hidden rounded-lg"
        >
          <ColorSliderGradient
            as="div"
            class="absolute inset-0 rounded-lg"
            :colors="getSliderColors(ch.key)"
          />
          <ColorSliderThumb
            :id="`slider-${ch.key}`"
            class="
              block size-6 rounded-full border-[2.5px] border-white bg-white
              shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
              outline-none
              focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
            "
            :aria-label="`${ch.label} slider, color: ${colorName}`"
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
      :model-value="color"
      :color-space="colorSpace"
      channel="alpha"
      class="w-full"
      as="div"
      @update:model-value="onColorUpdate"
    >
      <ColorSliderTrack
        as="div"
        class="relative h-6 overflow-hidden rounded-lg"
      >
        <ColorSliderCheckerboard />
        <ColorSliderGradient
          as="div"
          class="absolute inset-0 rounded-lg"
          :colors="getSliderColors('alpha')"
        />
        <ColorSliderThumb
          id="slider-alpha"
          class="
            block size-6 rounded-full border-[2.5px] border-white bg-white
            shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
            outline-none
            focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
          "
          :aria-label="`Alpha slider, color: ${colorName}`"
        />
      </ColorSliderTrack>
    </ColorSliderRoot>

    <!-- Last row: [swatch] [hex field + N-channel fields] -->
    <ColorSwatchRoot
      :model-value="color"
      :alpha="true"
      class="
        color-swatch relative block aspect-square w-full self-end
        overflow-hidden rounded-lg border border-(--vp-c-divider)
      "
    />
    <div
      class="flex flex-wrap items-end gap-2"
    >
      <div
        class="min-w-[100px] flex flex-1 flex-col gap-1"
      >
        <Label
          for="field-hex"
          class="text-xs font-semibold text-(--vp-c-text-2)"
        >Hex</Label>
        <ColorFieldRoot
          :model-value="color"
          color-space="hex"
          channel="hex"
          format="hex"
          class="
            color-field-root flex items-center overflow-hidden rounded-md border
            border-(--vp-c-divider) bg-(--vp-c-bg)
          "
          @update:model-value="onColorUpdate"
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
      <div class="min-w-[100px] flex flex-1 flex-col gap-1">
        <Label
          for="field-alpha"
          class="text-xs font-semibold text-(--vp-c-text-2)"
        >A</Label>
        <ColorFieldRoot
          :model-value="color"
          :color-space="colorSpace"
          channel="alpha"
          class="
            color-field-root flex items-center overflow-hidden rounded-md border
            border-(--vp-c-divider) bg-(--vp-c-bg)
          "
          @update:model-value="onColorUpdate"
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
        class="min-w-[100px] flex flex-1 flex-col gap-1"
      >
        <Label
          :for="`field-${ch.key}`"
          class="text-xs font-semibold text-(--vp-c-text-2)"
        >{{ ch.label.charAt(0).toUpperCase() }}</Label>
        <ColorFieldRoot
          :model-value="color"
          :color-space="colorSpace"
          :channel="ch.key"
          class="
            color-field-root flex items-center overflow-hidden rounded-md border
            border-(--vp-c-divider) bg-(--vp-c-bg)
          "
          @update:model-value="onColorUpdate"
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
</template>

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

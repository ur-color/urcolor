import type { Meta, StoryObj } from "@storybook/vue3";
import "internationalized-color/css";
import { defineComponent, h, shallowRef } from "vue";
import { ColorSliderRoot, ColorSliderTrack, ColorSliderGradient, ColorSliderCheckerboard, ColorSliderThumb } from "./index";

type Story = StoryObj<typeof ColorSliderRoot>;

function horizontalSlider(props: Record<string, unknown> = {}, { alpha = false } = {}) {
  return h(
    ColorSliderRoot,
    { class: "block w-75", ...props },
    () =>
      h(
        ColorSliderTrack,
        { class: "block relative h-4 rounded-xl outline outline-1 outline-gray-300 overflow-hidden" },
        () => [
          ...(alpha ? [h(ColorSliderCheckerboard, { class: "block absolute inset-0" })] : []),
          h(ColorSliderGradient, { class: "block inset-0" }),
          h(ColorSliderThumb, {
            class: "absolute size-4 rounded-full border-2 border-white shadow",
          }),
        ],
      ),
  );
}

function verticalSlider(props: Record<string, unknown> = {}, { alpha = false } = {}) {
  return h(
    ColorSliderRoot,
    { class: "block h-50", orientation: "vertical", ...props },
    () =>
      h(
        ColorSliderTrack,
        { class: "block relative w-4 h-full rounded-xl outline outline-1 outline-gray-300 overflow-hidden" },
        () => [
          ...(alpha ? [h(ColorSliderCheckerboard, { class: "block absolute inset-0" })] : []),
          h(ColorSliderGradient, { class: "block inset-0" }),
          h(ColorSliderThumb, {
            class: "absolute size-4 rounded-full border-2 border-white shadow",
          }),
        ],
      ),
  );
}

function sliderPair(props: Record<string, unknown> = {}, opts: { alpha?: boolean } = {}) {
  return h("div", { class: "flex items-start gap-4" }, [
    horizontalSlider(props, opts),
    verticalSlider(props, opts),
  ]);
}

function renderSlider(props: Record<string, unknown> = {}, opts: { alpha?: boolean } = {}) {
  return () => h(defineComponent({
    setup() {
      const color = shallowRef<unknown>(null);
      const bind = (extra: Record<string, unknown> = {}) => ({
        ...props, ...extra, "modelValue": color.value,
        "onUpdate:modelValue": (v: unknown) => { color.value = v; },
      });
      return () =>
        h("div", { class: "grid grid-cols-2 gap-6" }, [
          h("div", [h("div", { class: "text-xs text-gray-500 mb-1" }, "Default"), sliderPair(bind(), opts)]),
          h("div", [h("div", { class: "text-xs text-gray-500 mb-1" }, "Inverted"), sliderPair(bind({ inverted: true }), opts)]),
        ]);
    },
  }));
}

const meta: Meta<typeof ColorSliderRoot> = {
  title: "ColorSlider",
  component: ColorSliderRoot,
};
export default meta;

// HSL
export const HSL_Hue: Story = { name: "HSL / Hue", render: renderSlider({ colorSpace: "hsl", channel: "h" }) };
export const HSL_Saturation: Story = { name: "HSL / Saturation", render: renderSlider({ colorSpace: "hsl", channel: "s" }) };
export const HSL_Lightness: Story = { name: "HSL / Lightness", render: renderSlider({ colorSpace: "hsl", channel: "l" }) };
export const HSL_Alpha: Story = { name: "HSL / Alpha", render: renderSlider({ colorSpace: "hsl", channel: "alpha" }, { alpha: true }) };

// HSV
export const HSV_Hue: Story = { name: "HSV / Hue", render: renderSlider({ colorSpace: "hsv", channel: "h" }) };
export const HSV_Saturation: Story = { name: "HSV / Saturation", render: renderSlider({ colorSpace: "hsv", channel: "s" }) };
export const HSV_Value: Story = { name: "HSV / Value", render: renderSlider({ colorSpace: "hsv", channel: "v" }) };
export const HSV_Alpha: Story = { name: "HSV / Alpha", render: renderSlider({ colorSpace: "hsv", channel: "alpha" }, { alpha: true }) };

// HWB
export const HWB_Hue: Story = { name: "HWB / Hue", render: renderSlider({ colorSpace: "hwb", channel: "h" }) };
export const HWB_Whiteness: Story = { name: "HWB / Whiteness", render: renderSlider({ colorSpace: "hwb", channel: "w" }) };
export const HWB_Blackness: Story = { name: "HWB / Blackness", render: renderSlider({ colorSpace: "hwb", channel: "b" }) };
export const HWB_Alpha: Story = { name: "HWB / Alpha", render: renderSlider({ colorSpace: "hwb", channel: "alpha" }, { alpha: true }) };

// OKLCh
export const OKLCh_Lightness: Story = { name: "OKLCh / Lightness", render: renderSlider({ colorSpace: "oklch", channel: "l" }) };
export const OKLCh_Chroma: Story = { name: "OKLCh / Chroma", render: renderSlider({ colorSpace: "oklch", channel: "c" }) };
export const OKLCh_Hue: Story = { name: "OKLCh / Hue", render: renderSlider({ colorSpace: "oklch", channel: "h" }) };
export const OKLCh_Alpha: Story = { name: "OKLCh / Alpha", render: renderSlider({ colorSpace: "oklch", channel: "alpha" }, { alpha: true }) };

// OKLab
export const OKLab_Lightness: Story = { name: "OKLab / Lightness", render: renderSlider({ colorSpace: "oklab", channel: "l" }) };
export const OKLab_a: Story = { name: "OKLab / a", render: renderSlider({ colorSpace: "oklab", channel: "a" }) };
export const OKLab_b: Story = { name: "OKLab / b", render: renderSlider({ colorSpace: "oklab", channel: "b" }) };
export const OKLab_Alpha: Story = { name: "OKLab / Alpha", render: renderSlider({ colorSpace: "oklab", channel: "alpha" }, { alpha: true }) };

// LCh
export const LCh_Lightness: Story = { name: "LCh / Lightness", render: renderSlider({ colorSpace: "lch", channel: "l" }) };
export const LCh_Chroma: Story = { name: "LCh / Chroma", render: renderSlider({ colorSpace: "lch", channel: "c" }) };
export const LCh_Hue: Story = { name: "LCh / Hue", render: renderSlider({ colorSpace: "lch", channel: "h" }) };
export const LCh_Alpha: Story = { name: "LCh / Alpha", render: renderSlider({ colorSpace: "lch", channel: "alpha" }, { alpha: true }) };

// Lab
export const Lab_Lightness: Story = { name: "Lab / Lightness", render: renderSlider({ colorSpace: "lab", channel: "l" }) };
export const Lab_a: Story = { name: "Lab / a", render: renderSlider({ colorSpace: "lab", channel: "a" }) };
export const Lab_b: Story = { name: "Lab / b", render: renderSlider({ colorSpace: "lab", channel: "b" }) };
export const Lab_Alpha: Story = { name: "Lab / Alpha", render: renderSlider({ colorSpace: "lab", channel: "alpha" }, { alpha: true }) };

// RGB
export const RGB_Red: Story = { name: "RGB / Red", render: renderSlider({ colorSpace: "rgb", channel: "r" }) };
export const RGB_Green: Story = { name: "RGB / Green", render: renderSlider({ colorSpace: "rgb", channel: "g" }) };
export const RGB_Blue: Story = { name: "RGB / Blue", render: renderSlider({ colorSpace: "rgb", channel: "b" }) };
export const RGB_Alpha: Story = { name: "RGB / Alpha", render: renderSlider({ colorSpace: "rgb", channel: "alpha" }, { alpha: true }) };

// Display P3
export const DisplayP3_Red: Story = { name: "Display P3 / Red", render: renderSlider({ colorSpace: "p3", channel: "r" }) };
export const DisplayP3_Green: Story = { name: "Display P3 / Green", render: renderSlider({ colorSpace: "p3", channel: "g" }) };
export const DisplayP3_Blue: Story = { name: "Display P3 / Blue", render: renderSlider({ colorSpace: "p3", channel: "b" }) };
export const DisplayP3_Alpha: Story = { name: "Display P3 / Alpha", render: renderSlider({ colorSpace: "p3", channel: "alpha" }, { alpha: true }) };

// A98 RGB
export const A98RGB_Red: Story = { name: "A98 RGB / Red", render: renderSlider({ colorSpace: "a98", channel: "r" }) };
export const A98RGB_Green: Story = { name: "A98 RGB / Green", render: renderSlider({ colorSpace: "a98", channel: "g" }) };
export const A98RGB_Blue: Story = { name: "A98 RGB / Blue", render: renderSlider({ colorSpace: "a98", channel: "b" }) };
export const A98RGB_Alpha: Story = { name: "A98 RGB / Alpha", render: renderSlider({ colorSpace: "a98", channel: "alpha" }, { alpha: true }) };

// ProPhoto RGB
export const ProPhotoRGB_Red: Story = { name: "ProPhoto RGB / Red", render: renderSlider({ colorSpace: "prophoto", channel: "r" }) };
export const ProPhotoRGB_Green: Story = { name: "ProPhoto RGB / Green", render: renderSlider({ colorSpace: "prophoto", channel: "g" }) };
export const ProPhotoRGB_Blue: Story = { name: "ProPhoto RGB / Blue", render: renderSlider({ colorSpace: "prophoto", channel: "b" }) };
export const ProPhotoRGB_Alpha: Story = { name: "ProPhoto RGB / Alpha", render: renderSlider({ colorSpace: "prophoto", channel: "alpha" }, { alpha: true }) };

// Rec. 2020
export const Rec2020_Red: Story = { name: "Rec. 2020 / Red", render: renderSlider({ colorSpace: "rec2020", channel: "r" }) };
export const Rec2020_Green: Story = { name: "Rec. 2020 / Green", render: renderSlider({ colorSpace: "rec2020", channel: "g" }) };
export const Rec2020_Blue: Story = { name: "Rec. 2020 / Blue", render: renderSlider({ colorSpace: "rec2020", channel: "b" }) };
export const Rec2020_Alpha: Story = { name: "Rec. 2020 / Alpha", render: renderSlider({ colorSpace: "rec2020", channel: "alpha" }, { alpha: true }) };

// Prop variations
export const Disabled: Story = { name: "Disabled", render: renderSlider({ disabled: true }) };
export const RTL: Story = { name: "RTL", render: renderSlider({ dir: "rtl" }) };

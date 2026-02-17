import type { Meta, StoryObj } from "@storybook/vue3";
import "internationalized-color/css";
import { defineComponent, h, shallowRef } from "vue";
import { ColorAreaRoot, ColorAreaTrack, ColorAreaGradient, ColorAreaCheckerboard, ColorAreaThumb } from "./index";

type Story = StoryObj<typeof ColorAreaRoot>;

function singleArea(props: Record<string, unknown> = {}, { alpha = false } = {}) {
  return h(
    ColorAreaRoot,
    { class: "block size-64", ...props },
    () =>
      h(
        ColorAreaTrack,
        { class: "block relative size-full rounded overflow-hidden" },
        () => [
          ...(alpha ? [h(ColorAreaCheckerboard, { class: "block absolute inset-0" })] : []),
          h(ColorAreaGradient, { class: "block absolute inset-0" }),
          h(ColorAreaThumb, {
            class: "absolute size-4 rounded-full border-2 border-white shadow",
          }),
        ],
      ),
  );
}

function renderArea(props: Record<string, unknown> = {}, opts: { alpha?: boolean } = {}) {
  return () => h(defineComponent({
    setup() {
      const color = shallowRef<unknown>(null);
      const bind = (extra: Record<string, unknown> = {}) => ({
        ...props, ...extra, "modelValue": color.value,
        "onUpdate:modelValue": (v: unknown) => { color.value = v; },
      });
      return () =>
        h("div", { class: "grid grid-cols-2 gap-4" }, [
          h("div", [h("div", { class: "text-xs text-gray-500 mb-1" }, "Default"), singleArea(bind(), opts)]),
          h("div", [h("div", { class: "text-xs text-gray-500 mb-1" }, "Inverted X"), singleArea(bind({ invertedX: true }), opts)]),
          h("div", [h("div", { class: "text-xs text-gray-500 mb-1" }, "Inverted Y"), singleArea(bind({ invertedY: true }), opts)]),
          h("div", [h("div", { class: "text-xs text-gray-500 mb-1" }, "Inverted X & Y"), singleArea(bind({ invertedX: true, invertedY: true }), opts)]),
        ]);
    },
  }));
}

const meta: Meta<typeof ColorAreaRoot> = {
  title: "ColorArea",
  component: ColorAreaRoot,
};
export default meta;

// HSL
export const HSL_Hue_Saturation: Story = { name: "HSL / Hue × Saturation", render: renderArea({ colorSpace: "hsl", channelX: "h", channelY: "s" }) };
export const HSL_Hue_Lightness: Story = { name: "HSL / Hue × Lightness", render: renderArea({ colorSpace: "hsl", channelX: "h", channelY: "l" }) };
export const HSL_Saturation_Lightness: Story = { name: "HSL / Saturation × Lightness", render: renderArea({ colorSpace: "hsl", channelX: "s", channelY: "l" }) };

// HSV
export const HSV_Hue_Saturation: Story = { name: "HSV / Hue × Saturation", render: renderArea({ colorSpace: "hsv", channelX: "h", channelY: "s" }) };
export const HSV_Hue_Value: Story = { name: "HSV / Hue × Value", render: renderArea({ colorSpace: "hsv", channelX: "h", channelY: "v" }) };
export const HSV_Saturation_Value: Story = { name: "HSV / Saturation × Value", render: renderArea({ colorSpace: "hsv", channelX: "s", channelY: "v" }) };

// HWB
export const HWB_Hue_Whiteness: Story = { name: "HWB / Hue × Whiteness", render: renderArea({ colorSpace: "hwb", channelX: "h", channelY: "w" }) };
export const HWB_Hue_Blackness: Story = { name: "HWB / Hue × Blackness", render: renderArea({ colorSpace: "hwb", channelX: "h", channelY: "b" }) };
export const HWB_Whiteness_Blackness: Story = { name: "HWB / Whiteness × Blackness", render: renderArea({ colorSpace: "hwb", channelX: "w", channelY: "b" }) };

// OKLCh
export const OKLCh_Lightness_Chroma: Story = { name: "OKLCh / Lightness × Chroma", render: renderArea({ colorSpace: "oklch", channelX: "l", channelY: "c" }) };
export const OKLCh_Lightness_Hue: Story = { name: "OKLCh / Lightness × Hue", render: renderArea({ colorSpace: "oklch", channelX: "l", channelY: "h" }) };
export const OKLCh_Chroma_Hue: Story = { name: "OKLCh / Chroma × Hue", render: renderArea({ colorSpace: "oklch", channelX: "c", channelY: "h" }) };

// OKLab
export const OKLab_Lightness_a: Story = { name: "OKLab / Lightness × a", render: renderArea({ colorSpace: "oklab", channelX: "l", channelY: "a" }) };
export const OKLab_Lightness_b: Story = { name: "OKLab / Lightness × b", render: renderArea({ colorSpace: "oklab", channelX: "l", channelY: "b" }) };
export const OKLab_a_b: Story = { name: "OKLab / a × b", render: renderArea({ colorSpace: "oklab", channelX: "a", channelY: "b" }) };

// LCh
export const LCh_Lightness_Chroma: Story = { name: "LCh / Lightness × Chroma", render: renderArea({ colorSpace: "lch", channelX: "l", channelY: "c" }) };
export const LCh_Lightness_Hue: Story = { name: "LCh / Lightness × Hue", render: renderArea({ colorSpace: "lch", channelX: "l", channelY: "h" }) };
export const LCh_Chroma_Hue: Story = { name: "LCh / Chroma × Hue", render: renderArea({ colorSpace: "lch", channelX: "c", channelY: "h" }) };

// Lab
export const Lab_Lightness_a: Story = { name: "Lab / Lightness × a", render: renderArea({ colorSpace: "lab", channelX: "l", channelY: "a" }) };
export const Lab_Lightness_b: Story = { name: "Lab / Lightness × b", render: renderArea({ colorSpace: "lab", channelX: "l", channelY: "b" }) };
export const Lab_a_b: Story = { name: "Lab / a × b", render: renderArea({ colorSpace: "lab", channelX: "a", channelY: "b" }) };

// RGB
export const RGB_Red_Green: Story = { name: "RGB / Red × Green", render: renderArea({ colorSpace: "rgb", channelX: "r", channelY: "g" }) };
export const RGB_Red_Blue: Story = { name: "RGB / Red × Blue", render: renderArea({ colorSpace: "rgb", channelX: "r", channelY: "b" }) };
export const RGB_Green_Blue: Story = { name: "RGB / Green × Blue", render: renderArea({ colorSpace: "rgb", channelX: "g", channelY: "b" }) };

// Display P3
export const DisplayP3_Red_Green: Story = { name: "Display P3 / Red × Green", render: renderArea({ colorSpace: "p3", channelX: "r", channelY: "g" }) };
export const DisplayP3_Red_Blue: Story = { name: "Display P3 / Red × Blue", render: renderArea({ colorSpace: "p3", channelX: "r", channelY: "b" }) };
export const DisplayP3_Green_Blue: Story = { name: "Display P3 / Green × Blue", render: renderArea({ colorSpace: "p3", channelX: "g", channelY: "b" }) };

// A98 RGB
export const A98RGB_Red_Green: Story = { name: "A98 RGB / Red × Green", render: renderArea({ colorSpace: "a98", channelX: "r", channelY: "g" }) };
export const A98RGB_Red_Blue: Story = { name: "A98 RGB / Red × Blue", render: renderArea({ colorSpace: "a98", channelX: "r", channelY: "b" }) };
export const A98RGB_Green_Blue: Story = { name: "A98 RGB / Green × Blue", render: renderArea({ colorSpace: "a98", channelX: "g", channelY: "b" }) };

// ProPhoto RGB
export const ProPhotoRGB_Red_Green: Story = { name: "ProPhoto RGB / Red × Green", render: renderArea({ colorSpace: "prophoto", channelX: "r", channelY: "g" }) };
export const ProPhotoRGB_Red_Blue: Story = { name: "ProPhoto RGB / Red × Blue", render: renderArea({ colorSpace: "prophoto", channelX: "r", channelY: "b" }) };
export const ProPhotoRGB_Green_Blue: Story = { name: "ProPhoto RGB / Green × Blue", render: renderArea({ colorSpace: "prophoto", channelX: "g", channelY: "b" }) };

// Rec. 2020
export const Rec2020_Red_Green: Story = { name: "Rec. 2020 / Red × Green", render: renderArea({ colorSpace: "rec2020", channelX: "r", channelY: "g" }) };
export const Rec2020_Red_Blue: Story = { name: "Rec. 2020 / Red × Blue", render: renderArea({ colorSpace: "rec2020", channelX: "r", channelY: "b" }) };
export const Rec2020_Green_Blue: Story = { name: "Rec. 2020 / Green × Blue", render: renderArea({ colorSpace: "rec2020", channelX: "g", channelY: "b" }) };

// Alpha combinations
export const HSL_Hue_Alpha: Story = { name: "HSL / Hue × Alpha", render: renderArea({ colorSpace: "hsl", channelX: "h", channelY: "alpha" }, { alpha: true }) };
export const HSL_Saturation_Alpha: Story = { name: "HSL / Saturation × Alpha", render: renderArea({ colorSpace: "hsl", channelX: "s", channelY: "alpha" }, { alpha: true }) };
export const HSL_Lightness_Alpha: Story = { name: "HSL / Lightness × Alpha", render: renderArea({ colorSpace: "hsl", channelX: "l", channelY: "alpha" }, { alpha: true }) };
export const HSV_Hue_Alpha: Story = { name: "HSV / Hue × Alpha", render: renderArea({ colorSpace: "hsv", channelX: "h", channelY: "alpha" }, { alpha: true }) };
export const HSV_Saturation_Alpha: Story = { name: "HSV / Saturation × Alpha", render: renderArea({ colorSpace: "hsv", channelX: "s", channelY: "alpha" }, { alpha: true }) };
export const HSV_Value_Alpha: Story = { name: "HSV / Value × Alpha", render: renderArea({ colorSpace: "hsv", channelX: "v", channelY: "alpha" }, { alpha: true }) };
export const RGB_Red_Alpha: Story = { name: "RGB / Red × Alpha", render: renderArea({ colorSpace: "rgb", channelX: "r", channelY: "alpha" }, { alpha: true }) };
export const RGB_Green_Alpha: Story = { name: "RGB / Green × Alpha", render: renderArea({ colorSpace: "rgb", channelX: "g", channelY: "alpha" }, { alpha: true }) };
export const RGB_Blue_Alpha: Story = { name: "RGB / Blue × Alpha", render: renderArea({ colorSpace: "rgb", channelX: "b", channelY: "alpha" }, { alpha: true }) };
export const OKLCh_Lightness_Alpha: Story = { name: "OKLCh / Lightness × Alpha", render: renderArea({ colorSpace: "oklch", channelX: "l", channelY: "alpha" }, { alpha: true }) };
export const OKLCh_Chroma_Alpha: Story = { name: "OKLCh / Chroma × Alpha", render: renderArea({ colorSpace: "oklch", channelX: "c", channelY: "alpha" }, { alpha: true }) };
export const OKLCh_Hue_Alpha: Story = { name: "OKLCh / Hue × Alpha", render: renderArea({ colorSpace: "oklch", channelX: "h", channelY: "alpha" }, { alpha: true }) };

// Prop variations
export const Disabled: Story = { name: "Disabled", render: renderArea({ disabled: true }) };
export const ThumbContain: Story = { name: "Thumb Contain", render: renderArea({ thumbAlignment: "contain" }) };
export const RTL: Story = { name: "RTL", render: renderArea({ dir: "rtl" }) };

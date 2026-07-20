import type { Meta, StoryObj } from "@storybook/vue3";
import { defineComponent, h, shallowRef } from "vue";
import { ColorAreaRoot, ColorAreaArea, ColorAreaGradient, ColorAreaCheckerboard, ColorAreaThumb } from "./index";

type Story = StoryObj<typeof ColorAreaRoot>;

function singleArea(props: Record<string, unknown> = {}, { alpha = false } = {}) {
  return h(
    ColorAreaRoot,
    { class: "block relative size-64 rounded overflow-hidden", ...props },
    () => [
      h(ColorAreaArea, { class: "block absolute inset-0" }, () => [
        ...(alpha ? [h(ColorAreaCheckerboard, { class: "block absolute inset-0" })] : []),
        h(ColorAreaGradient, { class: "block absolute inset-0" }),
        h(ColorAreaThumb, {
          class: "absolute size-4 rounded-full border-2 border-white shadow",
        }),
      ]),
    ],
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
export const HSL_Hue_Saturation: Story = { name: "HSL / Hue × Saturation", render: renderArea({ colorSpace: "hsl", xChannel: "h", yChannel: "s" }) };
export const HSL_Hue_Lightness: Story = { name: "HSL / Hue × Lightness", render: renderArea({ colorSpace: "hsl", xChannel: "h", yChannel: "l" }) };
export const HSL_Saturation_Lightness: Story = { name: "HSL / Saturation × Lightness", render: renderArea({ colorSpace: "hsl", xChannel: "s", yChannel: "l" }) };

// HSV
export const HSV_Hue_Saturation: Story = { name: "HSV / Hue × Saturation", render: renderArea({ colorSpace: "hsv", xChannel: "h", yChannel: "s" }) };
export const HSV_Hue_Value: Story = { name: "HSV / Hue × Value", render: renderArea({ colorSpace: "hsv", xChannel: "h", yChannel: "v" }) };
export const HSV_Saturation_Value: Story = { name: "HSV / Saturation × Value", render: renderArea({ colorSpace: "hsv", xChannel: "s", yChannel: "v" }) };

// HWB
export const HWB_Hue_Whiteness: Story = { name: "HWB / Hue × Whiteness", render: renderArea({ colorSpace: "hwb", xChannel: "h", yChannel: "w" }) };
export const HWB_Hue_Blackness: Story = { name: "HWB / Hue × Blackness", render: renderArea({ colorSpace: "hwb", xChannel: "h", yChannel: "b" }) };
export const HWB_Whiteness_Blackness: Story = { name: "HWB / Whiteness × Blackness", render: renderArea({ colorSpace: "hwb", xChannel: "w", yChannel: "b" }) };

// OKLCh
export const OKLCh_Lightness_Chroma: Story = { name: "OKLCh / Lightness × Chroma", render: renderArea({ colorSpace: "oklch", xChannel: "l", yChannel: "c" }) };
export const OKLCh_Lightness_Hue: Story = { name: "OKLCh / Lightness × Hue", render: renderArea({ colorSpace: "oklch", xChannel: "l", yChannel: "h" }) };
export const OKLCh_Chroma_Hue: Story = { name: "OKLCh / Chroma × Hue", render: renderArea({ colorSpace: "oklch", xChannel: "c", yChannel: "h" }) };

// OKLab
export const OKLab_Lightness_a: Story = { name: "OKLab / Lightness × a", render: renderArea({ colorSpace: "oklab", xChannel: "l", yChannel: "a" }) };
export const OKLab_Lightness_b: Story = { name: "OKLab / Lightness × b", render: renderArea({ colorSpace: "oklab", xChannel: "l", yChannel: "b" }) };
export const OKLab_a_b: Story = { name: "OKLab / a × b", render: renderArea({ colorSpace: "oklab", xChannel: "a", yChannel: "b" }) };

// LCh
export const LCh_Lightness_Chroma: Story = { name: "LCh / Lightness × Chroma", render: renderArea({ colorSpace: "lch", xChannel: "l", yChannel: "c" }) };
export const LCh_Lightness_Hue: Story = { name: "LCh / Lightness × Hue", render: renderArea({ colorSpace: "lch", xChannel: "l", yChannel: "h" }) };
export const LCh_Chroma_Hue: Story = { name: "LCh / Chroma × Hue", render: renderArea({ colorSpace: "lch", xChannel: "c", yChannel: "h" }) };

// Lab
export const Lab_Lightness_a: Story = { name: "Lab / Lightness × a", render: renderArea({ colorSpace: "lab", xChannel: "l", yChannel: "a" }) };
export const Lab_Lightness_b: Story = { name: "Lab / Lightness × b", render: renderArea({ colorSpace: "lab", xChannel: "l", yChannel: "b" }) };
export const Lab_a_b: Story = { name: "Lab / a × b", render: renderArea({ colorSpace: "lab", xChannel: "a", yChannel: "b" }) };

// RGB
export const RGB_Red_Green: Story = { name: "RGB / Red × Green", render: renderArea({ colorSpace: "srgb", xChannel: "r", yChannel: "g" }) };
export const RGB_Red_Blue: Story = { name: "RGB / Red × Blue", render: renderArea({ colorSpace: "srgb", xChannel: "r", yChannel: "b" }) };
export const RGB_Green_Blue: Story = { name: "RGB / Green × Blue", render: renderArea({ colorSpace: "srgb", xChannel: "g", yChannel: "b" }) };

// Display P3
export const DisplayP3_Red_Green: Story = { name: "Display P3 / Red × Green", render: renderArea({ colorSpace: "display-p3", xChannel: "r", yChannel: "g" }) };
export const DisplayP3_Red_Blue: Story = { name: "Display P3 / Red × Blue", render: renderArea({ colorSpace: "display-p3", xChannel: "r", yChannel: "b" }) };
export const DisplayP3_Green_Blue: Story = { name: "Display P3 / Green × Blue", render: renderArea({ colorSpace: "display-p3", xChannel: "g", yChannel: "b" }) };

// A98 RGB
export const A98RGB_Red_Green: Story = { name: "A98 RGB / Red × Green", render: renderArea({ colorSpace: "a98-rgb", xChannel: "r", yChannel: "g" }) };
export const A98RGB_Red_Blue: Story = { name: "A98 RGB / Red × Blue", render: renderArea({ colorSpace: "a98-rgb", xChannel: "r", yChannel: "b" }) };
export const A98RGB_Green_Blue: Story = { name: "A98 RGB / Green × Blue", render: renderArea({ colorSpace: "a98-rgb", xChannel: "g", yChannel: "b" }) };

// ProPhoto RGB
export const ProPhotoRGB_Red_Green: Story = { name: "ProPhoto RGB / Red × Green", render: renderArea({ colorSpace: "prophoto-rgb", xChannel: "r", yChannel: "g" }) };
export const ProPhotoRGB_Red_Blue: Story = { name: "ProPhoto RGB / Red × Blue", render: renderArea({ colorSpace: "prophoto-rgb", xChannel: "r", yChannel: "b" }) };
export const ProPhotoRGB_Green_Blue: Story = { name: "ProPhoto RGB / Green × Blue", render: renderArea({ colorSpace: "prophoto-rgb", xChannel: "g", yChannel: "b" }) };

// Rec. 2020
export const Rec2020_Red_Green: Story = { name: "Rec. 2020 / Red × Green", render: renderArea({ colorSpace: "rec2020", xChannel: "r", yChannel: "g" }) };
export const Rec2020_Red_Blue: Story = { name: "Rec. 2020 / Red × Blue", render: renderArea({ colorSpace: "rec2020", xChannel: "r", yChannel: "b" }) };
export const Rec2020_Green_Blue: Story = { name: "Rec. 2020 / Green × Blue", render: renderArea({ colorSpace: "rec2020", xChannel: "g", yChannel: "b" }) };

// Alpha combinations
export const HSL_Hue_Alpha: Story = { name: "HSL / Hue × Alpha", render: renderArea({ colorSpace: "hsl", xChannel: "h", yChannel: "alpha" }, { alpha: true }) };
export const HSL_Saturation_Alpha: Story = { name: "HSL / Saturation × Alpha", render: renderArea({ colorSpace: "hsl", xChannel: "s", yChannel: "alpha" }, { alpha: true }) };
export const HSL_Lightness_Alpha: Story = { name: "HSL / Lightness × Alpha", render: renderArea({ colorSpace: "hsl", xChannel: "l", yChannel: "alpha" }, { alpha: true }) };
export const HSV_Hue_Alpha: Story = { name: "HSV / Hue × Alpha", render: renderArea({ colorSpace: "hsv", xChannel: "h", yChannel: "alpha" }, { alpha: true }) };
export const HSV_Saturation_Alpha: Story = { name: "HSV / Saturation × Alpha", render: renderArea({ colorSpace: "hsv", xChannel: "s", yChannel: "alpha" }, { alpha: true }) };
export const HSV_Value_Alpha: Story = { name: "HSV / Value × Alpha", render: renderArea({ colorSpace: "hsv", xChannel: "v", yChannel: "alpha" }, { alpha: true }) };
export const RGB_Red_Alpha: Story = { name: "RGB / Red × Alpha", render: renderArea({ colorSpace: "srgb", xChannel: "r", yChannel: "alpha" }, { alpha: true }) };
export const RGB_Green_Alpha: Story = { name: "RGB / Green × Alpha", render: renderArea({ colorSpace: "srgb", xChannel: "g", yChannel: "alpha" }, { alpha: true }) };
export const RGB_Blue_Alpha: Story = { name: "RGB / Blue × Alpha", render: renderArea({ colorSpace: "srgb", xChannel: "b", yChannel: "alpha" }, { alpha: true }) };
export const OKLCh_Lightness_Alpha: Story = { name: "OKLCh / Lightness × Alpha", render: renderArea({ colorSpace: "oklch", xChannel: "l", yChannel: "alpha" }, { alpha: true }) };
export const OKLCh_Chroma_Alpha: Story = { name: "OKLCh / Chroma × Alpha", render: renderArea({ colorSpace: "oklch", xChannel: "c", yChannel: "alpha" }, { alpha: true }) };
export const OKLCh_Hue_Alpha: Story = { name: "OKLCh / Hue × Alpha", render: renderArea({ colorSpace: "oklch", xChannel: "h", yChannel: "alpha" }, { alpha: true }) };

// Prop variations
export const Disabled: Story = { name: "Disabled", render: renderArea({ disabled: true }) };
export const ThumbContain: Story = { name: "Thumb Contain", render: renderArea({ thumbAlignment: "contain" }) };
export const RTL: Story = { name: "RTL", render: renderArea({ dir: "rtl" }) };

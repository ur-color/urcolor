import type { Meta, StoryObj } from "@storybook/vue3";
import "internationalized-color/css";
import { defineComponent, h, shallowRef } from "vue";
import type { Color } from "internationalized-color";
import {
  ColorFieldRoot,
  ColorFieldInput,
  ColorFieldIncrement,
  ColorFieldDecrement,
  ColorFieldSwatch,
} from "./index";

type Story = StoryObj<typeof ColorFieldRoot>;

function fieldContent({ showButtons = false, showSwatch = false } = {}) {
  const children: ReturnType<typeof h>[] = [];
  if (showSwatch) {
    children.push(
      h(ColorFieldSwatch, {
        class: "block size-6 rounded border border-gray-300",
      }),
    );
  }
  children.push(
    h(ColorFieldInput, {
      class: "w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center",
    }),
  );
  if (showButtons) {
    children.push(
      h(ColorFieldDecrement, { class: "px-2 py-1 border border-gray-300 rounded cursor-pointer" }, () => "−"),
      h(ColorFieldIncrement, { class: "px-2 py-1 border border-gray-300 rounded cursor-pointer" }, () => "+"),
    );
  }
  return children;
}

function renderField(props: Record<string, unknown> = {}, opts: { showButtons?: boolean; showSwatch?: boolean } = {}) {
  return () => h(defineComponent({
    setup() {
      const color = shallowRef<Color | string | null>(null);
      return () =>
        h(
          ColorFieldRoot,
          {
            "class": "inline-flex items-center gap-1 font-sans",
            ...props,
            "modelValue": color.value,
            "onUpdate:modelValue": (v: Color | undefined) => { color.value = v ?? null; },
          },
          () => fieldContent(opts),
        );
    },
  }));
}

const meta: Meta<typeof ColorFieldRoot> = {
  title: "ColorField",
  component: ColorFieldRoot,
};
export default meta;

// HSL
export const HSL_Hue: Story = { name: "HSL / Hue", render: renderField({ colorSpace: "hsl", channel: "h" }) };
export const HSL_Saturation: Story = { name: "HSL / Saturation", render: renderField({ colorSpace: "hsl", channel: "s" }) };
export const HSL_Lightness: Story = { name: "HSL / Lightness", render: renderField({ colorSpace: "hsl", channel: "l" }) };
export const HSL_Alpha: Story = { name: "HSL / Alpha", render: renderField({ colorSpace: "hsl", channel: "alpha" }) };

// HSV
export const HSV_Hue: Story = { name: "HSV / Hue", render: renderField({ colorSpace: "hsv", channel: "h" }) };
export const HSV_Saturation: Story = { name: "HSV / Saturation", render: renderField({ colorSpace: "hsv", channel: "s" }) };
export const HSV_Value: Story = { name: "HSV / Value", render: renderField({ colorSpace: "hsv", channel: "v" }) };

// HWB
export const HWB_Hue: Story = { name: "HWB / Hue", render: renderField({ colorSpace: "hwb", channel: "h" }) };
export const HWB_Whiteness: Story = { name: "HWB / Whiteness", render: renderField({ colorSpace: "hwb", channel: "w" }) };
export const HWB_Blackness: Story = { name: "HWB / Blackness", render: renderField({ colorSpace: "hwb", channel: "b" }) };

// OKLCh
export const OKLCh_Lightness: Story = { name: "OKLCh / Lightness", render: renderField({ colorSpace: "oklch", channel: "l" }) };
export const OKLCh_Chroma: Story = { name: "OKLCh / Chroma", render: renderField({ colorSpace: "oklch", channel: "c" }) };
export const OKLCh_Hue: Story = { name: "OKLCh / Hue", render: renderField({ colorSpace: "oklch", channel: "h" }) };
export const OKLCh_Alpha: Story = { name: "OKLCh / Alpha", render: renderField({ colorSpace: "oklch", channel: "alpha" }) };

// OKLab
export const OKLab_Lightness: Story = { name: "OKLab / Lightness", render: renderField({ colorSpace: "oklab", channel: "l" }) };
export const OKLab_a: Story = { name: "OKLab / a", render: renderField({ colorSpace: "oklab", channel: "a" }) };
export const OKLab_b: Story = { name: "OKLab / b", render: renderField({ colorSpace: "oklab", channel: "b" }) };

// LCh
export const LCh_Lightness: Story = { name: "LCh / Lightness", render: renderField({ colorSpace: "lch", channel: "l" }) };
export const LCh_Chroma: Story = { name: "LCh / Chroma", render: renderField({ colorSpace: "lch", channel: "c" }) };
export const LCh_Hue: Story = { name: "LCh / Hue", render: renderField({ colorSpace: "lch", channel: "h" }) };

// Lab
export const Lab_Lightness: Story = { name: "Lab / Lightness", render: renderField({ colorSpace: "lab", channel: "l" }) };
export const Lab_a: Story = { name: "Lab / a", render: renderField({ colorSpace: "lab", channel: "a" }) };
export const Lab_b: Story = { name: "Lab / b", render: renderField({ colorSpace: "lab", channel: "b" }) };

// RGB
export const RGB_Red: Story = { name: "RGB / Red", render: renderField({ colorSpace: "rgb", channel: "r" }) };
export const RGB_Green: Story = { name: "RGB / Green", render: renderField({ colorSpace: "rgb", channel: "g" }) };
export const RGB_Blue: Story = { name: "RGB / Blue", render: renderField({ colorSpace: "rgb", channel: "b" }) };
export const RGB_Alpha: Story = { name: "RGB / Alpha", render: renderField({ colorSpace: "rgb", channel: "alpha" }) };

// Display P3
export const DisplayP3_Red: Story = { name: "Display P3 / Red", render: renderField({ colorSpace: "p3", channel: "r" }) };
export const DisplayP3_Green: Story = { name: "Display P3 / Green", render: renderField({ colorSpace: "p3", channel: "g" }) };
export const DisplayP3_Blue: Story = { name: "Display P3 / Blue", render: renderField({ colorSpace: "p3", channel: "b" }) };

// A98 RGB
export const A98RGB_Red: Story = { name: "A98 RGB / Red", render: renderField({ colorSpace: "a98", channel: "r" }) };
export const A98RGB_Green: Story = { name: "A98 RGB / Green", render: renderField({ colorSpace: "a98", channel: "g" }) };
export const A98RGB_Blue: Story = { name: "A98 RGB / Blue", render: renderField({ colorSpace: "a98", channel: "b" }) };

// ProPhoto RGB
export const ProPhotoRGB_Red: Story = { name: "ProPhoto RGB / Red", render: renderField({ colorSpace: "prophoto", channel: "r" }) };
export const ProPhotoRGB_Green: Story = { name: "ProPhoto RGB / Green", render: renderField({ colorSpace: "prophoto", channel: "g" }) };
export const ProPhotoRGB_Blue: Story = { name: "ProPhoto RGB / Blue", render: renderField({ colorSpace: "prophoto", channel: "b" }) };

// Rec. 2020
export const Rec2020_Red: Story = { name: "Rec. 2020 / Red", render: renderField({ colorSpace: "rec2020", channel: "r" }) };
export const Rec2020_Green: Story = { name: "Rec. 2020 / Green", render: renderField({ colorSpace: "rec2020", channel: "g" }) };
export const Rec2020_Blue: Story = { name: "Rec. 2020 / Blue", render: renderField({ colorSpace: "rec2020", channel: "b" }) };

// Prop variations
export const WithButtons: Story = { name: "With Increment/Decrement Buttons", render: renderField({}, { showButtons: true }) };
export const WithSwatch: Story = { name: "With Swatch", render: renderField({}, { showSwatch: true }) };
export const WithSwatchAndButtons: Story = { name: "With Swatch and Buttons", render: renderField({}, { showSwatch: true, showButtons: true }) };
export const Disabled: Story = { name: "Disabled", render: renderField({ disabled: true }) };
export const ReadOnly: Story = { name: "Read Only", render: renderField({ readOnly: true }) };

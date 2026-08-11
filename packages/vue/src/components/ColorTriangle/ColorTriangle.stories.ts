import type { Meta, StoryObj } from "@storybook/vue3";
import { defineComponent, h, shallowRef } from "vue";
import { ColorTriangleRoot, ColorTriangleGradient, ColorTriangleThumb } from "./index";

type Story = StoryObj<typeof ColorTriangleRoot>;

function singleTriangle(props: Record<string, unknown> = {}) {
  return h(
    ColorTriangleRoot,
    { class: "block relative size-64", ...props },
    () => [
      h(ColorTriangleGradient, { class: "block absolute inset-0" }),
      h(ColorTriangleThumb, {
        class: "size-4 rounded-full border-2 border-white shadow",
      }),
    ],
  );
}

function renderTriangle(props: Record<string, unknown> = {}) {
  return () => h(defineComponent({
    setup() {
      const color = shallowRef<unknown>(null);
      const bind = (extra: Record<string, unknown> = {}) => ({
        ...props, ...extra, "modelValue": color.value,
        "onUpdate:modelValue": (v: unknown) => { color.value = v; },
      });
      return () =>
        h("div", { class: "flex gap-4" }, [
          h("div", [h("div", { class: "text-xs text-gray-500 mb-1" }, "Default"), singleTriangle(bind())]),
        ]);
    },
  }));
}

const meta: Meta<typeof ColorTriangleRoot> = {
  title: "ColorTriangle",
  component: ColorTriangleRoot,
};
export default meta;

export const HSV_Saturation_Value: Story = { name: "HSV / Saturation × Value", render: renderTriangle({ colorSpace: "hsv", xChannel: "s", yChannel: "v" }) };
export const HSL_Saturation_Lightness: Story = { name: "HSL / Saturation × Lightness", render: renderTriangle({ colorSpace: "hsl", xChannel: "s", yChannel: "l" }) };
export const OKLCh_Chroma_Lightness: Story = { name: "OKLCh / Chroma × Lightness", render: renderTriangle({ colorSpace: "oklch", xChannel: "c", yChannel: "l" }) };
export const HWB_Whiteness_Blackness: Story = { name: "HWB / Whiteness × Blackness", render: renderTriangle({ colorSpace: "hwb", xChannel: "w", yChannel: "b" }) };
export const Rotated: Story = { name: "HSV / Rotated 90°", render: renderTriangle({ colorSpace: "hsv", xChannel: "s", yChannel: "v", style: "transform: rotate(90deg)" }) };
export const Disabled: Story = { name: "Disabled", render: renderTriangle({ disabled: true }) };

// 3-channel (Maxwell's triangle) stories
export const Maxwell_RGB: Story = { name: "Maxwell's RGB Triangle", render: renderTriangle({ colorSpace: "srgb", xChannel: "r", yChannel: "g", zChannel: "b" }) };
export const OKLab_abL: Story = { name: "OKLab / a × b × L", render: renderTriangle({ colorSpace: "oklab", xChannel: "a", yChannel: "b", zChannel: "l" }) };
export const P3_RGB: Story = { name: "Display P3 Triangle", render: renderTriangle({ colorSpace: "display-p3", xChannel: "r", yChannel: "g", zChannel: "b" }) };
export const HSL_HSL: Story = { name: "HSL / H × S × L", render: renderTriangle({ colorSpace: "hsl", xChannel: "h", yChannel: "s", zChannel: "l" }) };

// Additional 2-channel stories
export const OKLab_ab: Story = { name: "OKLab / a × b", render: renderTriangle({ colorSpace: "oklab", xChannel: "a", yChannel: "b" }) };
export const Lab_ab: Story = { name: "Lab / a × b", render: renderTriangle({ colorSpace: "lab", xChannel: "a", yChannel: "b" }) };
export const RGB_RG: Story = { name: "RGB / R × G", render: renderTriangle({ colorSpace: "srgb", xChannel: "r", yChannel: "g" }) };

// Thumb alignment stories
export const ThumbContain: Story = { name: "Thumb Contain", render: renderTriangle({ colorSpace: "hsv", xChannel: "s", yChannel: "v", thumbAlignment: "contain" }) };
export const ThumbContain3Channel: Story = { name: "Thumb Contain / 3-Channel", render: renderTriangle({ colorSpace: "srgb", xChannel: "r", yChannel: "g", zChannel: "b", thumbAlignment: "contain" }) };

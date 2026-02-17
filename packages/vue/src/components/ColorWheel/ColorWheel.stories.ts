import type { Meta, StoryObj } from "@storybook/vue3";
import "internationalized-color/css";
import { defineComponent, h, shallowRef } from "vue";
import { ColorWheelRoot, ColorWheelGradient, ColorWheelCheckerboard, ColorWheelThumb } from "./index";

type Story = StoryObj<typeof ColorWheelRoot>;

function singleWheel(props: Record<string, unknown> = {}, { alpha = false } = {}) {
  return h(
    ColorWheelRoot,
    { class: "block relative size-64 rounded-full overflow-hidden", style: "container-type: inline-size", ...props },
    () => [
      ...(alpha ? [h(ColorWheelCheckerboard)] : []),
      h(ColorWheelGradient, { class: "block absolute inset-0" }),
      h(ColorWheelThumb, {
        class: "size-4 rounded-full border-2 border-white shadow",
      }),
    ],
  );
}

function renderWheel(props: Record<string, unknown> = {}, opts: { alpha?: boolean } = {}) {
  return () => h(defineComponent({
    setup() {
      const color = shallowRef<unknown>(null);
      const bind = (extra: Record<string, unknown> = {}) => ({
        ...props, ...extra, "modelValue": color.value,
        "onUpdate:modelValue": (v: unknown) => { color.value = v; },
      });
      return () =>
        h("div", { class: "flex gap-4" }, [
          h("div", [h("div", { class: "text-xs text-gray-500 mb-1" }, "Default"), singleWheel(bind(), opts)]),
        ]);
    },
  }));
}

const meta: Meta<typeof ColorWheelRoot> = {
  title: "ColorWheel",
  component: ColorWheelRoot,
};
export default meta;

export const HSL_Hue_Saturation: Story = { name: "HSL / Hue × Saturation", render: renderWheel({ colorSpace: "hsl", channelAngle: "h", channelRadius: "s" }) };
export const HSL_Hue_Lightness: Story = { name: "HSL / Hue × Lightness", render: renderWheel({ colorSpace: "hsl", channelAngle: "h", channelRadius: "l" }) };
export const HSV_Hue_Saturation: Story = { name: "HSV / Hue × Saturation", render: renderWheel({ colorSpace: "hsv", channelAngle: "h", channelRadius: "s" }) };
export const HSV_Hue_Value: Story = { name: "HSV / Hue × Value", render: renderWheel({ colorSpace: "hsv", channelAngle: "h", channelRadius: "v" }) };
export const OKLCh_Hue_Chroma: Story = { name: "OKLCh / Hue × Chroma", render: renderWheel({ colorSpace: "oklch", channelAngle: "h", channelRadius: "c" }) };
export const OKLCh_Hue_Lightness: Story = { name: "OKLCh / Hue × Lightness", render: renderWheel({ colorSpace: "oklch", channelAngle: "h", channelRadius: "l" }) };
export const LCh_Hue_Chroma: Story = { name: "LCh / Hue × Chroma", render: renderWheel({ colorSpace: "lch", channelAngle: "h", channelRadius: "c" }) };
export const Rotated_90: Story = { name: "HSL / Rotated 90°", render: renderWheel({ colorSpace: "hsl", channelAngle: "h", channelRadius: "s", startAngle: 90 }) };
export const Rotated_180: Story = { name: "HSL / Rotated 180°", render: renderWheel({ colorSpace: "hsl", channelAngle: "h", channelRadius: "s", startAngle: 180 }) };
export const Rotated_270: Story = { name: "HSL / Rotated 270°", render: renderWheel({ colorSpace: "hsl", channelAngle: "h", channelRadius: "s", startAngle: 270 }) };
export const Disabled: Story = { name: "Disabled", render: renderWheel({ disabled: true }) };

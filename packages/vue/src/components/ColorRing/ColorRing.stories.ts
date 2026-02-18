import type { Meta, StoryObj } from "@storybook/vue3";
import { defineComponent, h, shallowRef } from "vue";
import { ColorRingRoot, ColorRingTrack, ColorRingGradient, ColorRingCheckerboard, ColorRingThumb } from "./index";

type Story = StoryObj<typeof ColorRingRoot>;

function singleRing(props: Record<string, unknown> = {}, { alpha = false } = {}) {
  return h(
    ColorRingRoot,
    { class: "block relative size-64", style: "container-type: inline-size", innerRadius: 0.85, ...props },
    () =>
      h(
        ColorRingTrack,
        { class: "block relative size-full" },
        () => [
          ...(alpha ? [h(ColorRingCheckerboard)] : []),
          h(ColorRingGradient, { class: "block absolute inset-0" }),
          h(ColorRingThumb, {
            class: "size-4 rounded-full border-2 border-white shadow",
          }),
        ],
      ),
  );
}

function renderRing(props: Record<string, unknown> = {}, opts: { alpha?: boolean } = {}) {
  return () => h(defineComponent({
    setup() {
      const color = shallowRef<unknown>(null);
      const bind = (extra: Record<string, unknown> = {}) => ({
        ...props, ...extra, "modelValue": color.value,
        "onUpdate:modelValue": (v: unknown) => { color.value = v; },
      });
      return () =>
        h("div", { class: "flex gap-4" }, [
          h("div", [h("div", { class: "text-xs text-gray-500 mb-1" }, "Default"), singleRing(bind(), opts)]),
        ]);
    },
  }));
}

const meta: Meta<typeof ColorRingRoot> = {
  title: "ColorRing",
  component: ColorRingRoot,
};
export default meta;

export const HSL_Hue: Story = { name: "HSL / Hue", render: renderRing({ colorSpace: "hsl", channel: "h" }) };
export const HSL_Saturation: Story = { name: "HSL / Saturation", render: renderRing({ colorSpace: "hsl", channel: "s" }) };
export const HSL_Lightness: Story = { name: "HSL / Lightness", render: renderRing({ colorSpace: "hsl", channel: "l" }) };
export const HSV_Hue: Story = { name: "HSV / Hue", render: renderRing({ colorSpace: "hsv", channel: "h" }) };
export const OKLCh_Hue: Story = { name: "OKLCh / Hue", render: renderRing({ colorSpace: "oklch", channel: "h" }) };
export const OKLCh_Chroma: Story = { name: "OKLCh / Chroma", render: renderRing({ colorSpace: "oklch", channel: "c" }) };
export const OKLCh_Lightness: Story = { name: "OKLCh / Lightness", render: renderRing({ colorSpace: "oklch", channel: "l" }) };
export const LCh_Hue: Story = { name: "LCh / Hue", render: renderRing({ colorSpace: "lch", channel: "h" }) };
export const Disabled: Story = { name: "Disabled", render: renderRing({ disabled: true }) };

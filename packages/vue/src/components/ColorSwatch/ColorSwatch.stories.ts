import type { Meta, StoryObj } from "@storybook/vue3";
import "internationalized-color/css";
import { h } from "vue";
import { ColorSwatchRoot } from "./index";

type Story = StoryObj<typeof ColorSwatchRoot>;

function renderSwatch(props: Record<string, unknown> = {}) {
  return () =>
    h(ColorSwatchRoot, {
      class: "block size-12 rounded-lg border border-gray-300",
      ...props,
    });
}

const meta: Meta<typeof ColorSwatchRoot> = {
  title: "ColorSwatch",
  component: ColorSwatchRoot,
};

export default meta;

export const Red: Story = {
  name: "Red",
  render: renderSwatch({ modelValue: "#ff0000" }),
};

export const Blue: Story = {
  name: "Blue",
  render: renderSwatch({ modelValue: "#0066ff" }),
};

export const Green: Story = {
  name: "Green",
  render: renderSwatch({ modelValue: "#00cc44" }),
};

export const SemiTransparent: Story = {
  name: "Semi-Transparent",
  render: renderSwatch({ modelValue: "rgba(255, 0, 0, 0.5)", alpha: true }),
};

export const AlphaEnabled: Story = {
  name: "Alpha Enabled",
  render: renderSwatch({ modelValue: "hsla(200, 100%, 50%, 0.3)", alpha: true }),
};

export const AlphaDisabled: Story = {
  name: "Alpha Disabled",
  render: renderSwatch({ modelValue: "hsla(200, 100%, 50%, 0.3)", alpha: false }),
};

export const SmallChecker: Story = {
  name: "Small Checker (8px)",
  render: renderSwatch({ modelValue: "rgba(0, 100, 255, 0.5)", alpha: true, checkerSize: 8 }),
};

export const LargeChecker: Story = {
  name: "Large Checker (32px)",
  render: renderSwatch({ modelValue: "rgba(0, 100, 255, 0.5)", alpha: true, checkerSize: 32 }),
};

export const HexFormat: Story = {
  name: "Hex Format",
  render: renderSwatch({ modelValue: "#e91e63" }),
};

export const RGBFormat: Story = {
  name: "RGB Format",
  render: renderSwatch({ modelValue: "rgb(33, 150, 243)" }),
};

export const HSLFormat: Story = {
  name: "HSL Format",
  render: renderSwatch({ modelValue: "hsl(120, 60%, 50%)" }),
};

export const OKLChFormat: Story = {
  name: "OKLCh Format",
  render: renderSwatch({ modelValue: "oklch(0.7 0.15 200)" }),
};

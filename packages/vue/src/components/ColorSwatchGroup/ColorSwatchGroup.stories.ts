import type { Meta, StoryObj } from "@storybook/vue3";
import "internationalized-color/css";
import { h } from "vue";
import { ColorSwatchGroupRoot, ColorSwatchGroupItem } from "./index";

type Story = StoryObj<typeof ColorSwatchGroupRoot>;

const itemClass = "block size-9 rounded-md border border-gray-300 cursor-pointer";
const groupClass = "flex gap-2 flex-wrap";

const materialColors = [
  "#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5",
  "#2196f3", "#03a9f4", "#00bcd4", "#009688", "#4caf50",
  "#8bc34a", "#cddc39", "#ffeb3b", "#ffc107", "#ff9800", "#ff5722",
];

const tailwindGrays = [
  "#f9fafb", "#f3f4f6", "#e5e7eb", "#d1d5db", "#9ca3af",
  "#6b7280", "#4b5563", "#374151", "#1f2937", "#111827",
];

function renderGroup(props: Record<string, unknown> = {}, colors: string[] = materialColors) {
  return () =>
    h(
      ColorSwatchGroupRoot,
      {
        class: groupClass,
        ...props,
      },
      () =>
        colors.map(color =>
          h(ColorSwatchGroupItem, {
            key: color,
            value: color,
            class: itemClass,
          }),
        ),
    );
}

const meta: Meta<typeof ColorSwatchGroupRoot> = {
  title: "ColorSwatchGroup",
  component: ColorSwatchGroupRoot,
};

export default meta;

export const SingleSelection: Story = {
  name: "Single Selection",
  render: renderGroup({ type: "single" }),
};

export const MultipleSelection: Story = {
  name: "Multiple Selection",
  render: renderGroup({ type: "multiple" }),
};

export const Vertical: Story = {
  name: "Vertical",
  render: renderGroup({
    type: "single",
    orientation: "vertical",
    class: "flex flex-col gap-2",
  }),
};

export const Disabled: Story = {
  name: "Disabled",
  render: renderGroup({ type: "single", disabled: true }),
};

export const NoLoop: Story = {
  name: "No Loop",
  render: renderGroup({ type: "single", loop: false }),
};

export const NoRovingFocus: Story = {
  name: "No Roving Focus",
  render: renderGroup({ type: "single", rovingFocus: false }),
};

export const MaterialPalette: Story = {
  name: "Material Palette",
  render: renderGroup({ type: "single" }, materialColors),
};

export const TailwindGrays: Story = {
  name: "Tailwind Grays",
  render: renderGroup({ type: "single" }, tailwindGrays),
};

export const RTL: Story = {
  name: "RTL",
  render: renderGroup({ type: "single", dir: "rtl" }),
};

import type { Meta, StoryObj } from "@storybook/vue3";
import { h } from "vue";
import {
  ColorSwatchPickerItem,
  ColorSwatchPickerItemIndicator,
  ColorSwatchPickerItemSwatch,
  ColorSwatchPickerRoot,
} from "./index";

type Story = StoryObj<typeof ColorSwatchPickerRoot>;

const itemClass = "block size-9 rounded-md border border-gray-300 cursor-pointer relative data-[state=checked]:ring-2 data-[state=checked]:ring-blue-500 data-[highlighted]:outline data-[highlighted]:outline-2 data-[highlighted]:outline-offset-2";
const swatchClass = "block size-full rounded-md";
const rootClass = "flex gap-2 flex-wrap";

const materialColors = [
  "#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5",
  "#2196f3", "#03a9f4", "#00bcd4", "#009688", "#4caf50",
  "#8bc34a", "#cddc39", "#ffeb3b", "#ffc107", "#ff9800", "#ff5722",
];

const tailwindGrays = [
  "#f9fafb", "#f3f4f6", "#e5e7eb", "#d1d5db", "#9ca3af",
  "#6b7280", "#4b5563", "#374151", "#1f2937", "#111827",
];

function renderPicker(
  props: Record<string, unknown> = {},
  colors: string[] = materialColors,
  withIndicator = false,
) {
  return () =>
    h(
      ColorSwatchPickerRoot,
      {
        class: rootClass,
        ...props,
      },
      () =>
        colors.map(color =>
          h(
            ColorSwatchPickerItem,
            { key: color, value: color, class: itemClass },
            () => [
              h(ColorSwatchPickerItemSwatch, { class: swatchClass }),
              ...(withIndicator
                ? [h(ColorSwatchPickerItemIndicator, {
                    class: "absolute inset-0 grid place-items-center text-white text-lg font-bold",
                  }, () => "✓")]
                : []),
            ],
          ),
        ),
    );
}

const meta: Meta<typeof ColorSwatchPickerRoot> = {
  title: "ColorSwatchPicker",
  component: ColorSwatchPickerRoot,
};

export default meta;

export const SingleSelection: Story = {
  name: "Single Selection",
  render: renderPicker(),
};

export const MultipleSelection: Story = {
  name: "Multiple Selection",
  render: renderPicker({ multiple: true }),
};

export const WithIndicator: Story = {
  name: "With Indicator",
  render: renderPicker({ defaultValue: "#2196f3" }, materialColors, true),
};

export const Vertical: Story = {
  name: "Vertical",
  render: renderPicker({
    orientation: "vertical",
    class: "flex flex-col gap-2 w-fit",
  }),
};

export const Disabled: Story = {
  name: "Disabled",
  render: renderPicker({ disabled: true }),
};

export const DefaultValue: Story = {
  name: "Default Value",
  render: renderPicker({ defaultValue: "#4caf50" }),
};

export const HighlightOnHover: Story = {
  name: "Highlight On Hover",
  render: renderPicker({ highlightOnHover: true }),
};

export const MaterialPalette: Story = {
  name: "Material Palette",
  render: renderPicker({}, materialColors),
};

export const TailwindGrays: Story = {
  name: "Tailwind Grays",
  render: renderPicker({}, tailwindGrays),
};

export const RTL: Story = {
  name: "RTL",
  render: renderPicker({ dir: "rtl" }),
};

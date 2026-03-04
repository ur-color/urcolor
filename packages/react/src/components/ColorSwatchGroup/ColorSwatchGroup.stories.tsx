import type { Meta, StoryObj } from "@storybook/react";
import "internationalized-color/css";
import * as ColorSwatchGroup from "./index.parts";

type Story = StoryObj<typeof ColorSwatchGroup.Root>;

const materialColors = [
  "#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5",
  "#2196f3", "#03a9f4", "#00bcd4", "#009688", "#4caf50",
  "#8bc34a", "#cddc39", "#ffeb3b", "#ffc107", "#ff9800", "#ff5722",
];

function GroupDemo(props: Record<string, unknown>, colors = materialColors) {
  return (
    <ColorSwatchGroup.Root className="flex gap-2 flex-wrap" {...props}>
      {colors.map(color => (
        <ColorSwatchGroup.Item
          key={color}
          value={color}
          className="block size-9 rounded-md border border-gray-300 cursor-pointer"
        />
      ))}
    </ColorSwatchGroup.Root>
  );
}

const meta: Meta<typeof ColorSwatchGroup.Root> = {
  title: "ColorSwatchGroup",
  component: ColorSwatchGroup.Root,
};
export default meta;

export const SingleSelection: Story = { name: "Single Selection", render: () => <GroupDemo type="single" /> };
export const MultipleSelection: Story = { name: "Multiple Selection", render: () => <GroupDemo type="multiple" /> };
export const Disabled: Story = { name: "Disabled", render: () => <GroupDemo type="single" disabled /> };

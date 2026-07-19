import type { Meta, StoryObj } from "@storybook/react";
import "internationalized-color/css";
import { useState } from "react";
import { Color } from "internationalized-color";
import * as ColorField from "./index.parts";

type Story = StoryObj<typeof ColorField.Root>;

function FieldDemo(props: Record<string, unknown>) {
  const [color, setColor] = useState<Color | undefined>();
  return (
    <ColorField.Root
      value={color}
      onValueChange={setColor}
      className="inline-flex items-center border border-gray-300 rounded-md overflow-hidden"
      {...props}
    >
      <ColorField.Decrement className="px-2 py-1 text-gray-500 hover:bg-gray-100">-</ColorField.Decrement>
      <ColorField.Input className="w-20 text-center py-1 outline-none" />
      <ColorField.Increment className="px-2 py-1 text-gray-500 hover:bg-gray-100">+</ColorField.Increment>
    </ColorField.Root>
  );
}

const meta: Meta<typeof ColorField.Root> = {
  title: "ColorField",
  component: ColorField.Root,
};
export default meta;

export const HSL_Hue: Story = { name: "HSL / Hue", render: () => <FieldDemo colorSpace="hsl" channel="h" /> };
export const HSL_Saturation: Story = { name: "HSL / Saturation", render: () => <FieldDemo colorSpace="hsl" channel="s" /> };
export const HSL_Lightness: Story = { name: "HSL / Lightness", render: () => <FieldDemo colorSpace="hsl" channel="l" /> };
export const HSL_Alpha: Story = { name: "HSL / Alpha", render: () => <FieldDemo colorSpace="hsl" channel="alpha" /> };
export const RGB_Red: Story = { name: "RGB / Red", render: () => <FieldDemo colorSpace="rgb" channel="r" /> };
export const Hex: Story = { name: "Hex", render: () => <FieldDemo colorSpace="rgb" channel="r" format="hex" /> };
export const Disabled: Story = { name: "Disabled", render: () => <FieldDemo colorSpace="hsl" channel="h" disabled /> };
export const ReadOnly: Story = { name: "ReadOnly", render: () => <FieldDemo colorSpace="hsl" channel="h" readOnly /> };

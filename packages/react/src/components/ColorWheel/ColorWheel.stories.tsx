import type { Meta, StoryObj } from "@storybook/react";
import "internationalized-color/css";
import { useState } from "react";
import { Color } from "internationalized-color";
import * as ColorWheel from "./index.parts";

type Story = StoryObj<typeof ColorWheel.Root>;

function WheelDemo(props: Record<string, unknown>) {
  const [color, setColor] = useState<Color | undefined>();
  return (
    <ColorWheel.Root
      value={color}
      onValueChange={setColor}
      className="block relative size-60 rounded-full"
      style={{ containerType: "inline-size" }}
      {...props}
    >
      <ColorWheel.Gradient className="block" />
      <ColorWheel.Thumb className="size-5 rounded-full border-2 border-white shadow bg-current">
        <ColorWheel.ThumbX />
        <ColorWheel.ThumbY />
      </ColorWheel.Thumb>
    </ColorWheel.Root>
  );
}

const meta: Meta<typeof ColorWheel.Root> = {
  title: "ColorWheel",
  component: ColorWheel.Root,
};
export default meta;

export const HSL_HueSaturation: Story = { name: "HSL / Hue + Saturation", render: () => <WheelDemo colorSpace="hsl" /> };
export const OKLCh_HueChroma: Story = { name: "OKLCh / Hue + Chroma", render: () => <WheelDemo colorSpace="oklch" channelAngle="h" channelRadius="c" /> };
export const Disabled: Story = { name: "Disabled", render: () => <WheelDemo colorSpace="hsl" disabled /> };

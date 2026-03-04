import type { Meta, StoryObj } from "@storybook/react";
import "internationalized-color/css";
import { useState } from "react";
import { Color } from "internationalized-color";
import { ColorWheelRoot, ColorWheelGradient, ColorWheelThumb, ColorWheelThumbX, ColorWheelThumbY } from "./index";

type Story = StoryObj<typeof ColorWheelRoot>;

function WheelDemo(props: Record<string, unknown>) {
  const [color, setColor] = useState<Color | undefined>();
  return (
    <ColorWheelRoot
      value={color}
      onValueChange={setColor}
      className="block relative size-60 rounded-full"
      style={{ containerType: "inline-size" }}
      {...props}
    >
      <ColorWheelGradient className="block" />
      <ColorWheelThumb className="size-5 rounded-full border-2 border-white shadow bg-current">
        <ColorWheelThumbX />
        <ColorWheelThumbY />
      </ColorWheelThumb>
    </ColorWheelRoot>
  );
}

const meta: Meta<typeof ColorWheelRoot> = {
  title: "ColorWheel",
  component: ColorWheelRoot,
};
export default meta;

export const HSL_HueSaturation: Story = { name: "HSL / Hue + Saturation", render: () => <WheelDemo colorSpace="hsl" /> };
export const OKLCh_HueChroma: Story = { name: "OKLCh / Hue + Chroma", render: () => <WheelDemo colorSpace="oklch" channelAngle="h" channelRadius="c" /> };
export const Disabled: Story = { name: "Disabled", render: () => <WheelDemo colorSpace="hsl" disabled /> };

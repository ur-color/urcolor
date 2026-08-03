import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Color } from "@urcolor/core";
import * as ColorArea from "./index.parts";

type Story = StoryObj<typeof ColorArea.Root>;

function AreaDemo(props: Record<string, unknown>) {
  const [color, setColor] = useState<Color | undefined>();
  return (
    <ColorArea.Root
      value={color}
      onValueChange={setColor}
      className="block relative w-60 h-60 rounded-lg overflow-hidden"
      style={{ containerType: "inline-size" }}
      {...props}
    >
      <ColorArea.Gradient className="block" />
      <ColorArea.Thumb className="absolute size-5 rounded-full border-2 border-white shadow" />
    </ColorArea.Root>
  );
}

const meta: Meta<typeof ColorArea.Root> = {
  title: "ColorArea",
  component: ColorArea.Root,
};
export default meta;

export const HSL_SaturationLightness: Story = { name: "HSL / S + L", render: () => <AreaDemo colorSpace="hsl" xChannel="s" yChannel="l" /> };
export const HSV_SaturationValue: Story = { name: "HSV / S + V", render: () => <AreaDemo colorSpace="hsv" xChannel="s" yChannel="v" /> };
export const OKLCh_ChromaHue: Story = { name: "OKLCh / C + H", render: () => <AreaDemo colorSpace="oklch" xChannel="c" yChannel="h" /> };
export const RGB_RedGreen: Story = { name: "RGB / R + G", render: () => <AreaDemo colorSpace="srgb" xChannel="r" yChannel="g" /> };
export const Disabled: Story = { name: "Disabled", render: () => <AreaDemo colorSpace="hsl" disabled /> };

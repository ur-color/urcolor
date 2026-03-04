import type { Meta, StoryObj } from "@storybook/react";
import "internationalized-color/css";
import { useState } from "react";
import { Color } from "internationalized-color";
import { ColorRingRoot, ColorRingTrack, ColorRingGradient, ColorRingThumb } from "./index";

type Story = StoryObj<typeof ColorRingRoot>;

function RingDemo(props: Record<string, unknown>) {
  const [color, setColor] = useState<Color | undefined>();
  return (
    <ColorRingRoot
      value={color}
      onValueChange={setColor}
      className="block relative size-60 rounded-full"
      style={{ containerType: "inline-size" }}
      {...props}
    >
      <ColorRingTrack className="block relative size-full rounded-full overflow-hidden">
        <ColorRingGradient className="block" />
        <ColorRingThumb className="size-5 rounded-full border-2 border-white shadow bg-current" />
      </ColorRingTrack>
    </ColorRingRoot>
  );
}

const meta: Meta<typeof ColorRingRoot> = {
  title: "ColorRing",
  component: ColorRingRoot,
};
export default meta;

export const HSL_Hue: Story = { name: "HSL / Hue", render: () => <RingDemo colorSpace="hsl" channel="h" /> };
export const OKLCh_Hue: Story = { name: "OKLCh / Hue", render: () => <RingDemo colorSpace="oklch" channel="h" /> };
export const Disabled: Story = { name: "Disabled", render: () => <RingDemo colorSpace="hsl" channel="h" disabled /> };

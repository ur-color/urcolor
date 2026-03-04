import type { Meta, StoryObj } from "@storybook/react";
import "internationalized-color/css";
import { useState } from "react";
import { Color } from "internationalized-color";
import * as ColorRing from "./index.parts";

type Story = StoryObj<typeof ColorRing.Root>;

function RingDemo(props: Record<string, unknown>) {
  const [color, setColor] = useState<Color | undefined>();
  return (
    <ColorRing.Root
      value={color}
      onValueChange={setColor}
      className="block relative size-60 rounded-full"
      style={{ containerType: "inline-size" }}
      {...props}
    >
      <ColorRing.Track className="block relative size-full rounded-full overflow-hidden">
        <ColorRing.Gradient className="block" />
        <ColorRing.Thumb className="size-5 rounded-full border-2 border-white shadow bg-current" />
      </ColorRing.Track>
    </ColorRing.Root>
  );
}

const meta: Meta<typeof ColorRing.Root> = {
  title: "ColorRing",
  component: ColorRing.Root,
};
export default meta;

export const HSL_Hue: Story = { name: "HSL / Hue", render: () => <RingDemo colorSpace="hsl" channel="h" /> };
export const OKLCh_Hue: Story = { name: "OKLCh / Hue", render: () => <RingDemo colorSpace="oklch" channel="h" /> };
export const Disabled: Story = { name: "Disabled", render: () => <RingDemo colorSpace="hsl" channel="h" disabled /> };

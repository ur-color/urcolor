import type { Meta, StoryObj } from "@storybook/react";
import "internationalized-color/css";
import { useState } from "react";
import { Color } from "internationalized-color";
import { ColorTriangleRoot, ColorTriangleGradient, ColorTriangleCheckerboard, ColorTriangleThumb, ColorTriangleThumbX, ColorTriangleThumbY, ColorTriangleThumbZ } from "./index";

type Story = StoryObj<typeof ColorTriangleRoot>;

function TriangleDemo(props: Record<string, unknown>) {
  const [color, setColor] = useState<Color | undefined>();
  const isThreeChannel = "channelZ" in props;
  return (
    <ColorTriangleRoot
      value={color}
      onValueChange={setColor}
      className="block relative size-64"
      {...props}
    >
      <ColorTriangleGradient className="block absolute inset-0" />
      <ColorTriangleThumb className="size-4 rounded-full border-2 border-white shadow bg-current">
        <ColorTriangleThumbX />
        <ColorTriangleThumbY />
        {isThreeChannel && <ColorTriangleThumbZ />}
      </ColorTriangleThumb>
    </ColorTriangleRoot>
  );
}

const meta: Meta<typeof ColorTriangleRoot> = {
  title: "ColorTriangle",
  component: ColorTriangleRoot,
};
export default meta;

export const HSV_SaturationValue: Story = { name: "HSV / S × V", render: () => <TriangleDemo colorSpace="hsv" channelX="s" channelY="v" /> };
export const HSL_SaturationLightness: Story = { name: "HSL / S × L", render: () => <TriangleDemo colorSpace="hsl" channelX="s" channelY="l" /> };
export const OKLCh_ChromaLightness: Story = { name: "OKLCh / C × L", render: () => <TriangleDemo colorSpace="oklch" channelX="c" channelY="l" /> };
export const Rotated: Story = { name: "HSV / Rotated 90°", render: () => <TriangleDemo colorSpace="hsv" channelX="s" channelY="v" rotation={90} /> };
export const Disabled: Story = { name: "Disabled", render: () => <TriangleDemo disabled /> };
export const Maxwell_RGB: Story = { name: "Maxwell's RGB Triangle", render: () => <TriangleDemo colorSpace="rgb" channelX="r" channelY="g" channelZ="b" /> };
export const P3_RGB: Story = { name: "Display P3 Triangle", render: () => <TriangleDemo colorSpace="p3" channelX="r" channelY="g" channelZ="b" /> };

import type { Meta, StoryObj } from "@storybook/react";
import "internationalized-color/css";
import { useState } from "react";
import { Color } from "internationalized-color";
import { ColorAreaRoot, ColorAreaTrack, ColorAreaGradient, ColorAreaCheckerboard, ColorAreaThumb, ColorAreaThumbX, ColorAreaThumbY } from "./index";

type Story = StoryObj<typeof ColorAreaRoot>;

function AreaDemo(props: Record<string, unknown>) {
  const [color, setColor] = useState<Color | undefined>();
  return (
    <ColorAreaRoot
      value={color}
      onValueChange={setColor}
      className="block relative w-60 h-60"
      style={{ containerType: "inline-size" }}
      {...props}
    >
      <ColorAreaTrack className="block relative w-full h-full rounded-lg overflow-hidden">
        <ColorAreaGradient className="block" />
        <ColorAreaThumb className="absolute size-5 rounded-full border-2 border-white shadow" style={{ transform: "var(--reka-slider-area-thumb-transform)" }}>
          <ColorAreaThumbX />
          <ColorAreaThumbY />
        </ColorAreaThumb>
      </ColorAreaTrack>
    </ColorAreaRoot>
  );
}

const meta: Meta<typeof ColorAreaRoot> = {
  title: "ColorArea",
  component: ColorAreaRoot,
};
export default meta;

export const HSL_SaturationLightness: Story = { name: "HSL / S + L", render: () => <AreaDemo colorSpace="hsl" channelX="s" channelY="l" /> };
export const HSV_SaturationValue: Story = { name: "HSV / S + V", render: () => <AreaDemo colorSpace="hsv" channelX="s" channelY="v" /> };
export const OKLCh_ChromaHue: Story = { name: "OKLCh / C + H", render: () => <AreaDemo colorSpace="oklch" channelX="c" channelY="h" /> };
export const RGB_RedGreen: Story = { name: "RGB / R + G", render: () => <AreaDemo colorSpace="rgb" channelX="r" channelY="g" /> };
export const Disabled: Story = { name: "Disabled", render: () => <AreaDemo colorSpace="hsl" disabled /> };

import type { Meta, StoryObj } from "@storybook/react";
import "internationalized-color/css";
import { useState } from "react";
import { Color } from "internationalized-color";
import * as ColorSlider from "./index.parts";

type Story = StoryObj<typeof ColorSlider.Root>;

function HorizontalSlider(props: Record<string, unknown> & { alpha?: boolean }) {
  const { alpha, ...rest } = props;
  return (
    <ColorSlider.Root className="block w-75" {...rest}>
      <ColorSlider.Control>
        <ColorSlider.Track className="block relative h-4 rounded-xl outline outline-1 outline-gray-300 overflow-hidden">
          {alpha && <ColorSlider.Checkerboard className="block absolute inset-0" />}
          <ColorSlider.Gradient className="block inset-0" />
          <ColorSlider.Thumb className="absolute size-4 rounded-full border-2 border-white shadow" />
        </ColorSlider.Track>
      </ColorSlider.Control>
    </ColorSlider.Root>
  );
}

function VerticalSlider(props: Record<string, unknown> & { alpha?: boolean }) {
  const { alpha, ...rest } = props;
  return (
    <ColorSlider.Root className="block h-50" orientation="vertical" {...rest}>
      <ColorSlider.Control>
        <ColorSlider.Track className="block relative w-4 h-full rounded-xl outline outline-1 outline-gray-300 overflow-hidden">
          {alpha && <ColorSlider.Checkerboard className="block absolute inset-0" />}
          <ColorSlider.Gradient className="block inset-0" />
          <ColorSlider.Thumb className="absolute size-4 rounded-full border-2 border-white shadow" />
        </ColorSlider.Track>
      </ColorSlider.Control>
    </ColorSlider.Root>
  );
}

function SliderDemo(props: Record<string, unknown> & { alpha?: boolean }) {
  const [color, setColor] = useState<Color | undefined>();
  const bind = (extra: Record<string, unknown> = {}) => ({
    ...props,
    ...extra,
    value: color,
    onValueChange: setColor,
  });
  return (
    <div className="grid grid-cols-2 gap-6">
      <div>
        <div className="text-xs text-gray-500 mb-1">Default</div>
        <div className="flex items-start gap-4">
          <HorizontalSlider {...bind()} />
          <VerticalSlider {...bind()} />
        </div>
      </div>
      <div>
        <div className="text-xs text-gray-500 mb-1">Inverted</div>
        <div className="flex items-start gap-4">
          <HorizontalSlider {...bind({ inverted: true })} />
          <VerticalSlider {...bind({ inverted: true })} />
        </div>
      </div>
    </div>
  );
}

function renderSlider(props: Record<string, unknown> = {}, opts: { alpha?: boolean } = {}) {
  return () => <SliderDemo {...props} alpha={opts.alpha} />;
}

const meta: Meta<typeof ColorSlider.Root> = {
  title: "ColorSlider",
  component: ColorSlider.Root,
};
export default meta;

// HSL
export const HSL_Hue: Story = { name: "HSL / Hue", render: renderSlider({ colorSpace: "hsl", channel: "h" }) };
export const HSL_Saturation: Story = { name: "HSL / Saturation", render: renderSlider({ colorSpace: "hsl", channel: "s" }) };
export const HSL_Lightness: Story = { name: "HSL / Lightness", render: renderSlider({ colorSpace: "hsl", channel: "l" }) };
export const HSL_Alpha: Story = { name: "HSL / Alpha", render: renderSlider({ colorSpace: "hsl", channel: "alpha" }, { alpha: true }) };

// HSV
export const HSV_Hue: Story = { name: "HSV / Hue", render: renderSlider({ colorSpace: "hsv", channel: "h" }) };
export const HSV_Saturation: Story = { name: "HSV / Saturation", render: renderSlider({ colorSpace: "hsv", channel: "s" }) };
export const HSV_Value: Story = { name: "HSV / Value", render: renderSlider({ colorSpace: "hsv", channel: "v" }) };

// OKLCh
export const OKLCh_Lightness: Story = { name: "OKLCh / Lightness", render: renderSlider({ colorSpace: "oklch", channel: "l" }) };
export const OKLCh_Chroma: Story = { name: "OKLCh / Chroma", render: renderSlider({ colorSpace: "oklch", channel: "c" }) };
export const OKLCh_Hue: Story = { name: "OKLCh / Hue", render: renderSlider({ colorSpace: "oklch", channel: "h" }) };

// RGB
export const RGB_Red: Story = { name: "RGB / Red", render: renderSlider({ colorSpace: "rgb", channel: "r" }) };
export const RGB_Green: Story = { name: "RGB / Green", render: renderSlider({ colorSpace: "rgb", channel: "g" }) };
export const RGB_Blue: Story = { name: "RGB / Blue", render: renderSlider({ colorSpace: "rgb", channel: "b" }) };

export const Disabled: Story = { name: "Disabled", render: renderSlider({ disabled: true }) };

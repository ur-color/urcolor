import type { Meta, StoryObj } from "@storybook/react";
import "internationalized-color/css";
import { ColorSwatchRoot } from "./index";

type Story = StoryObj<typeof ColorSwatchRoot>;

const meta: Meta<typeof ColorSwatchRoot> = {
  title: "ColorSwatch",
  component: ColorSwatchRoot,
};

export default meta;

function Swatch(props: Record<string, unknown>) {
  return <ColorSwatchRoot className="block size-12 rounded-lg border border-gray-300" {...props} />;
}

export const Red: Story = { name: "Red", render: () => <Swatch value="#ff0000" /> };
export const Blue: Story = { name: "Blue", render: () => <Swatch value="#0066ff" /> };
export const Green: Story = { name: "Green", render: () => <Swatch value="#00cc44" /> };
export const SemiTransparent: Story = { name: "Semi-Transparent", render: () => <Swatch value="rgba(255, 0, 0, 0.5)" alpha /> };
export const AlphaEnabled: Story = { name: "Alpha Enabled", render: () => <Swatch value="hsla(200, 100%, 50%, 0.3)" alpha /> };
export const AlphaDisabled: Story = { name: "Alpha Disabled", render: () => <Swatch value="hsla(200, 100%, 50%, 0.3)" alpha={false} /> };
export const SmallChecker: Story = { name: "Small Checker (8px)", render: () => <Swatch value="rgba(0, 100, 255, 0.5)" alpha checkerSize={8} /> };
export const LargeChecker: Story = { name: "Large Checker (32px)", render: () => <Swatch value="rgba(0, 100, 255, 0.5)" alpha checkerSize={32} /> };
export const HexFormat: Story = { name: "Hex Format", render: () => <Swatch value="#e91e63" /> };
export const RGBFormat: Story = { name: "RGB Format", render: () => <Swatch value="rgb(33, 150, 243)" /> };
export const HSLFormat: Story = { name: "HSL Format", render: () => <Swatch value="hsl(120, 60%, 50%)" /> };
export const OKLChFormat: Story = { name: "OKLCh Format", render: () => <Swatch value="oklch(0.7 0.15 200)" /> };

import { ColorRing, ColorTriangle, useColor } from "@urcolor/react";

export default function ColorPickerTriangleInRingGuide() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    <div className="relative size-64">
      <ColorRing.Root
        value={color}
        onValueChange={setColor}
        colorSpace="hsv"
        channel="h"
        innerRadius={0.84}
        className="absolute inset-0"
        style={{ containerType: "inline-size" }}
      >
        <ColorRing.Track className="relative block size-full">
          <ColorRing.Gradient
            className="absolute inset-0 block"
            channelOverrides={{ s: 1, v: 1, alpha: 1 }}
          />
          <ColorRing.Thumb
            className="
              size-4 rounded-full border-2 border-white
              shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
              focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
            "
            aria-label="Hue"
          />
        </ColorRing.Track>
      </ColorRing.Root>

      <ColorTriangle.Root
        value={color}
        onValueChange={setColor}
        colorSpace="hsv"
        xChannel="s"
        yChannel="v"
        inverted
        className="absolute inset-[8%] rotate-90"
      >
        <ColorTriangle.Gradient className="absolute inset-0 block" />
        <ColorTriangle.Thumb
          className="
            size-4 rounded-full border-2 border-white
            shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
            focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
          "
          aria-label="Color"
        />
      </ColorTriangle.Root>
    </div>
  );
}

import "internationalized-color/css";
import { ColorRing, useColor } from "@urcolor/react";

export default function ColorRingSaturation() {
  const { color, setColor, hex } = useColor("hsl(210, 80%, 50%)");

  return (
    <>
      <code>{hex}</code>
      <ColorRing.Root
        value={color}
        onValueChange={setColor}
        colorSpace="hsl"
        channel="s"
        innerRadius={0.85}
        className="relative block size-64"
        style={{ containerType: "inline-size" }}
      >
        <ColorRing.Track className="relative block size-full">
          <ColorRing.Gradient className="absolute inset-0 block" />
          <ColorRing.Thumb
            className="
              size-4 rounded-full border-2 border-white
              shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
              focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
            "
          />
        </ColorRing.Track>
      </ColorRing.Root>
    </>
  );
}

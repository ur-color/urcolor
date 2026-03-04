import "internationalized-color/css";
import { ColorTriangle, useColor } from "@urcolor/react";

export default function ColorTriangleSL() {
  const { color, setColor, hex } = useColor("hsl(210, 80%, 50%)");

  return (
    <>
      <code>{hex}</code>
      <ColorTriangle.Root
        value={color}
        onValueChange={setColor}
        colorSpace="hsl"
        channelX="s"
        channelY="l"
        className="relative block size-64"
      >
        <ColorTriangle.Gradient className="absolute inset-0 block" />
        <ColorTriangle.Thumb
          className="
            size-4 rounded-full border-2 border-white
            shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
            focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
          "
        />
      </ColorTriangle.Root>
    </>
  );
}

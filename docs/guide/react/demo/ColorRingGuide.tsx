import "internationalized-color/css";
import {
  useColor,
  ColorRingRoot,
  ColorRingTrack,
  ColorRingGradient,
  ColorRingThumb,
} from "@urcolor/react";

export default function ColorRingGuide() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    <ColorRingRoot
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      channel="h"
      innerRadius={0.85}
      className="relative block size-64"
      style={{ containerType: "inline-size" }}
    >
      <ColorRingTrack className="relative block size-full">
        <ColorRingGradient className="absolute inset-0 block" />
        <ColorRingThumb
          className="
            size-4 rounded-full border-2 border-white
            shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
            focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
          "
          aria-label="Hue"
        />
      </ColorRingTrack>
    </ColorRingRoot>
  );
}

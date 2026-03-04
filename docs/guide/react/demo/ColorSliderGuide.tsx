import "internationalized-color/css";
import {
  useColor,
  ColorSliderRoot,
  ColorSliderTrack,
  ColorSliderGradient,
  ColorSliderThumb,
} from "@urcolor/react";

export default function ColorSliderGuide() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    <ColorSliderRoot
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      channel="h"
      className="w-full"
    >
      <ColorSliderTrack className="relative h-5 overflow-hidden rounded-xl">
        <ColorSliderGradient
          className="absolute inset-0 rounded-xl"
          colors={["red", "yellow", "lime", "cyan", "blue", "magenta", "red"]}
        />
        <ColorSliderThumb
          className="
            block size-5 rounded-full border-[2.5px] border-white bg-white
            shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
            focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
          "
          aria-label="Hue"
        />
      </ColorSliderTrack>
    </ColorSliderRoot>
  );
}

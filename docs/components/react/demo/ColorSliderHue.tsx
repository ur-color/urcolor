import "internationalized-color/css";
import { ColorSlider, useColor } from "@urcolor/react";

export default function ColorSliderHue() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    <ColorSlider.Root
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      channel="h"
      className="w-full"
    >
      <ColorSlider.Control>
        <ColorSlider.Track className="relative h-5 overflow-hidden rounded-xl">
          <ColorSlider.Gradient
            className="absolute inset-0 rounded-xl"
            colors={["red", "yellow", "lime", "cyan", "blue", "magenta", "red"]}
          />
          <ColorSlider.Thumb
            className="
              block size-5 rounded-full border-[2.5px] border-white bg-white
              shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
              focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
            "
            aria-label="Hue"
          />
        </ColorSlider.Track>
      </ColorSlider.Control>
    </ColorSlider.Root>
  );
}

import "internationalized-color/css";
import { ColorSlider, useColor } from "@urcolor/react";

export default function ColorSliderVertical() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    <ColorSlider.Root
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      channel="h"
      orientation="vertical"
      className="h-[150px] w-auto"
    >
      <ColorSlider.Control>
        <ColorSlider.Track className="relative h-full w-5 overflow-hidden rounded-xl">
          <ColorSlider.Gradient
            className="absolute inset-0 rounded-xl"
            colors={["red", "yellow", "lime", "cyan", "blue", "magenta", "red"]}
            angle={180}
          />
          <ColorSlider.Thumb
            className="
              block size-5 rounded-full border-[2.5px] border-white bg-white
              shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
              focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
            "
            aria-label="Hue (vertical)"
          />
        </ColorSlider.Track>
      </ColorSlider.Control>
    </ColorSlider.Root>
  );
}

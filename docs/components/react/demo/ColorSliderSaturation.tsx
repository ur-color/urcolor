import { useMemo } from "react";
import "internationalized-color/css";
import { getChannelConfig } from "@urcolor/core";
import {
  ColorSliderRoot,
  ColorSliderTrack,
  ColorSliderGradient,
  ColorSliderThumb,
  useColor,
} from "@urcolor/react";

export default function ColorSliderSaturation() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  const gradientColors = useMemo(() => {
    const cfg = getChannelConfig("hsl", "s");
    if (!cfg) return ["gray", "blue"];
    const steps = 7;
    const colors: string[] = [];
    const cMin = cfg.culoriMin ?? cfg.min;
    const cMax = cfg.culoriMax ?? cfg.max;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const val = cMin + t * (cMax - cMin);
      colors.push(color.set({ mode: "hsl", s: val })?.toString() ?? "black");
    }
    return colors;
  }, [color]);

  return (
    <ColorSliderRoot
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      channel="s"
      className="w-full"
    >
      <ColorSliderTrack className="relative h-5 overflow-hidden rounded-xl">
        <ColorSliderGradient
          className="absolute inset-0 rounded-xl"
          colors={gradientColors}
        />
        <ColorSliderThumb
          className="
            block size-5 rounded-full border-[2.5px] border-white bg-white
            shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
            focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
          "
          aria-label="Saturation"
        />
      </ColorSliderTrack>
    </ColorSliderRoot>
  );
}

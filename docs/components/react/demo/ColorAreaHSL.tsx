import "internationalized-color/css";
import {
  ColorAreaRoot,
  ColorAreaTrack,
  ColorAreaGradient,
  ColorAreaThumb,
  useColor,
} from "@urcolor/react";

export default function ColorAreaHSL() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    <ColorAreaRoot
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      channelX="h"
      channelY="s"
      className="block"
      aria-label="HSL color area"
    >
      <ColorAreaTrack
        className="
          relative h-[200px] w-full cursor-crosshair touch-none overflow-clip
          rounded-lg
        "
      >
        <ColorAreaGradient className="absolute inset-0" />
        <ColorAreaThumb
          className="
            absolute size-5
            rounded-full border-2 border-white
            shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
          "
        />
      </ColorAreaTrack>
    </ColorAreaRoot>
  );
}

import "internationalized-color/css";
import { ColorArea, useColor } from "@urcolor/react";

export default function ColorAreaOKLCh() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    <ColorArea.Root
      value={color}
      onValueChange={setColor}
      colorSpace="oklch"
      channelX="c"
      channelY="l"
      className="block"
      aria-label="OKLCh color area"
    >
      <ColorArea.Track
        className="
          relative h-[200px] w-full cursor-crosshair touch-none overflow-clip
          rounded-lg
        "
      >
        <ColorArea.Gradient className="absolute inset-0" />
        <ColorArea.Thumb
          className="
            absolute size-5
            rounded-full border-2 border-white
            shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
          "
        />
      </ColorArea.Track>
    </ColorArea.Root>
  );
}

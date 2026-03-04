import "internationalized-color/css";
import { ColorField, useColor } from "@urcolor/react";

export default function ColorFieldHex() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    <div className="flex items-center gap-3">
      <ColorField.Root
        value={color}
        onValueChange={setColor}
        colorSpace="hex"
        channel="hex"
        format="hex"
        className="
          flex h-8 items-center overflow-hidden rounded-md border
          border-[var(--vp-c-divider)] bg-[var(--vp-c-bg)] px-3
        "
      >
        <ColorField.Input
          className="
            min-w-0 flex-1 border-none bg-transparent px-3 py-1.5 font-mono
            text-[13px] text-[var(--vp-c-text-1)] outline-none
          "
        />
      </ColorField.Root>
    </div>
  );
}

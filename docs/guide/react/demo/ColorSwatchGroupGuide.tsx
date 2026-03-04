import { useState } from "react";
import "internationalized-color/css";
import { ColorSwatchGroupRoot, ColorSwatchGroupItem } from "@urcolor/react";

const colors = [
  "hsl(210, 80%, 50%)",
  "hsl(350, 90%, 60%)",
  "hsl(120, 60%, 45%)",
  "hsl(45, 100%, 55%)",
  "hsl(280, 70%, 55%)",
  "hsl(15, 85%, 55%)",
];

export default function ColorSwatchGroupGuide() {
  const [selected, setSelected] = useState<string[]>([colors[0]!]);

  return (
    <div className="flex flex-col gap-4">
      <ColorSwatchGroupRoot
        value={selected}
        onValueChange={setSelected}
        type="single"
        className="flex items-center gap-2"
      >
        {colors.map((color) => (
          <ColorSwatchGroupItem
            key={color}
            value={color}
            className="
              flex size-10 cursor-pointer items-center justify-center rounded-lg
              outline-none
            "
          >
            <svg
              className={`size-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition-opacity duration-150 ${selected.includes(color) ? "opacity-100" : "opacity-0"}`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </ColorSwatchGroupItem>
        ))}
      </ColorSwatchGroupRoot>
      <p className="text-sm text-[var(--vp-c-text-2)]">
        Selected: <code>{selected[0] ?? "none"}</code>
      </p>
    </div>
  );
}

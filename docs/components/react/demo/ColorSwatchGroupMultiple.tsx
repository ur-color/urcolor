import { useState } from "react";
import "internationalized-color/css";
import { ColorSwatchGroup } from "@urcolor/react";

const colors = [
  "hsl(210, 80%, 50%)",
  "hsl(350, 90%, 60%)",
  "hsl(120, 60%, 45%)",
  "hsl(45, 100%, 55%)",
  "hsl(280, 70%, 55%)",
  "hsl(15, 85%, 55%)",
];

export default function ColorSwatchGroupMultiple() {
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <div className="flex flex-col gap-4">
      <ColorSwatchGroup.Root
        value={selected}
        onValueChange={setSelected}
        type="multiple"
        className="flex items-center gap-2"
      >
        {colors.map((color) => (
          <ColorSwatchGroup.Item
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
          </ColorSwatchGroup.Item>
        ))}
      </ColorSwatchGroup.Root>
      <p className="text-sm text-gray-500">
        Selected: <code>{selected.length ? selected.join(", ") : "none"}</code>
      </p>
    </div>
  );
}

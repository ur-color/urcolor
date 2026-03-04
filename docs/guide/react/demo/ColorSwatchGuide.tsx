import { useState } from "react";
import "internationalized-color/css";
import { Color } from "internationalized-color";
import { ColorSwatchRoot } from "@urcolor/react";

const colors = [
  Color.parse("hsl(210, 80%, 50%)")!,
  Color.parse("hsl(350, 90%, 60%)")!,
  Color.parse("hsl(120, 60%, 45%)")!,
  Color.parse("hsla(45, 100%, 55%, 0.5)")!,
];

export default function ColorSwatchGuide() {
  const [selected, setSelected] = useState(0);

  return (
    <div className="flex items-center gap-3">
      {colors.map((color, i) => (
        <ColorSwatchRoot
          key={i}
          value={color}
          alpha
          className="flex size-10 cursor-pointer items-center justify-center rounded-lg"
          onClick={() => setSelected(i)}
        >
          <svg
            className={`size-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition-opacity duration-150 ${selected === i ? "opacity-100" : "opacity-0"}`}
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
        </ColorSwatchRoot>
      ))}
    </div>
  );
}

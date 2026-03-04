import "internationalized-color/css";
import { colorSpaces } from "@urcolor/core";
import {
  ColorFieldRoot,
  ColorFieldInput,
  ColorFieldIncrement,
  ColorFieldDecrement,
  useColor,
} from "@urcolor/react";

export default function ColorFieldHSL() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");
  const channels = colorSpaces["hsl"]?.channels ?? [];

  return (
    <div className="flex items-start gap-4">
      <div className="flex flex-1 flex-wrap gap-2">
        {channels.map((ch) => (
          <div key={ch.key} className="flex min-w-[80px] flex-1 flex-col gap-1">
            <label
              htmlFor={`field-${ch.key}`}
              className="text-xs font-semibold text-[var(--vp-c-text-2)]"
            >
              {ch.label}
            </label>
            <ColorFieldRoot
              value={color}
              onValueChange={setColor}
              colorSpace="hsl"
              channel={ch.key}
              className="
                flex items-center overflow-hidden rounded-md border
                border-[var(--vp-c-divider)] bg-[var(--vp-c-bg)]
              "
            >
              <ColorFieldDecrement
                className="
                  flex size-8 shrink-0 cursor-pointer items-center justify-center
                  border-r border-none border-r-[var(--vp-c-divider)] bg-transparent
                  text-lg leading-none text-[var(--vp-c-text-2)] select-none
                  hover:not-disabled:bg-[var(--vp-c-bg-soft)]
                  hover:not-disabled:text-[var(--vp-c-text-1)]
                  disabled:cursor-default disabled:opacity-30
                "
              >
                &minus;
              </ColorFieldDecrement>
              <ColorFieldInput
                id={`field-${ch.key}`}
                className="
                  w-0 min-w-0 flex-1 border-none bg-transparent px-0.5 py-1
                  text-center font-mono text-[13px] text-[var(--vp-c-text-1)]
                  outline-none
                "
              />
              <ColorFieldIncrement
                className="
                  flex size-8 shrink-0 cursor-pointer items-center justify-center
                  border-l border-none border-l-[var(--vp-c-divider)] bg-transparent
                  text-lg leading-none text-[var(--vp-c-text-2)] select-none
                  hover:not-disabled:bg-[var(--vp-c-bg-soft)]
                  hover:not-disabled:text-[var(--vp-c-text-1)]
                  disabled:cursor-default disabled:opacity-30
                "
              >
                +
              </ColorFieldIncrement>
            </ColorFieldRoot>
          </div>
        ))}
      </div>
    </div>
  );
}

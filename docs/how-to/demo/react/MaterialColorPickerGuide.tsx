import { ColorArea, ColorField, ColorSlider, useColor } from "@urcolor/react";

export default function MaterialColorPickerGuide() {
  const { color, setColor, channels } = useColor("hsl(210, 80%, 50%)", "hsl");

  return (
    <div
      className="
        flex w-full max-w-xs flex-col gap-3 rounded-xl border
        border-[var(--vp-c-divider)] bg-[var(--vp-c-bg)] p-3 shadow-sm
      "
    >
      <ColorArea.Root
        value={color}
        onValueChange={setColor}
        colorSpace="hsv"
        xChannel="s"
        yChannel="v"
        yInverted
        className="
          relative block h-[180px] w-full cursor-crosshair touch-none overflow-clip
          rounded-lg
        "
      >
        <ColorArea.Gradient className="absolute inset-0" />
        <ColorArea.Thumb
          className="
            absolute size-5
            rounded-full border-2 border-white
            shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
            focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
          "
        />
      </ColorArea.Root>

      <ColorSlider.Root
        value={color}
        onValueChange={setColor}
        colorSpace="hsv"
        channel="h"
        className="w-full"
      >
        <ColorSlider.Control>
          <ColorSlider.Track className="relative h-4 overflow-hidden rounded-full">
            <ColorSlider.Gradient
              className="absolute inset-0 rounded-full"
              colors={["red", "yellow", "lime", "cyan", "blue", "magenta", "red"]}
            />
            <ColorSlider.Thumb
              className="
                block size-4 rounded-full border-2 border-white
                shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
                focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
              "
              aria-label="Hue"
            />
          </ColorSlider.Track>
        </ColorSlider.Control>
      </ColorSlider.Root>

      <ColorSlider.Root
        value={color}
        onValueChange={setColor}
        colorSpace="hsv"
        channel="alpha"
        className="w-full"
      >
        <ColorSlider.Control>
          <ColorSlider.Track className="relative h-4 overflow-hidden rounded-full">
            <ColorSlider.Gradient className="absolute inset-0 rounded-full" />
            <ColorSlider.Thumb
              className="
                block size-4 rounded-full border-2 border-white
                shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
                focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
              "
              aria-label="Alpha"
            />
          </ColorSlider.Track>
        </ColorSlider.Control>
      </ColorSlider.Root>

      <div className="flex flex-1 flex-wrap gap-2">
        {channels.map((ch) => (
          <div key={ch.key} className="flex min-w-[60px] flex-1 flex-col gap-1">
            <label
              htmlFor={`material-field-${ch.key}`}
              className="text-xs font-semibold text-[var(--vp-c-text-2)]"
            >
              {ch.label}
            </label>
            <ColorField.Root
              value={color}
              onValueChange={setColor}
              colorSpace="hsl"
              channel={ch.key}
              className="
                flex items-center overflow-hidden rounded-md border
                border-[var(--vp-c-divider)] bg-[var(--vp-c-bg)]
              "
            >
              <ColorField.Decrement
                className="
                  flex size-7 shrink-0 cursor-pointer items-center justify-center
                  border-none bg-transparent text-lg leading-none text-[var(--vp-c-text-2)]
                  select-none
                  hover:not-disabled:bg-[var(--vp-c-bg-soft)]
                  hover:not-disabled:text-[var(--vp-c-text-1)]
                  disabled:cursor-default disabled:opacity-30
                "
              >
                &minus;
              </ColorField.Decrement>
              <ColorField.Input
                id={`material-field-${ch.key}`}
                className="
                  w-0 min-w-0 flex-1 border-none bg-transparent px-0.5 py-1
                  text-center font-mono text-[13px] text-[var(--vp-c-text-1)] outline-none
                "
              />
              <ColorField.Increment
                className="
                  flex size-7 shrink-0 cursor-pointer items-center justify-center
                  border-none bg-transparent text-lg leading-none text-[var(--vp-c-text-2)]
                  select-none
                  hover:not-disabled:bg-[var(--vp-c-bg-soft)]
                  hover:not-disabled:text-[var(--vp-c-text-1)]
                  disabled:cursor-default disabled:opacity-30
                "
              >
                +
              </ColorField.Increment>
            </ColorField.Root>
          </div>
        ))}
      </div>
    </div>
  );
}

# Build Color Channel Slider

Let's build a 1D color slider step by step.

<script setup>
import ReactMount from '../../components/ReactMount.vue'
import ColorSliderGuide from './demo/ColorSliderGuide.tsx'
</script>

Here's what we'll end up with:

<ReactMount :component="ColorSliderGuide" />


<details>
<summary>Click to view the full code</summary>

::: code-group

<<< @/guide/react/demo/ColorSliderGuide.tsx

:::

</details>

## Step 1: Set up state

Start by importing the color hook and creating color state.

```tsx
import { useColor } from "@urcolor/react"; // [!code ++]

function MySlider() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)"); // [!code ++]
}
```

`useColor()` creates color state from any CSS color string. It returns `{ color, setColor }` where `color` is a `Color` instance.

## Step 2: Add the root

`ColorSlider.Root` manages all the state and interactions. Tell it which color space and channel to control.

```tsx
import { useColor, ColorSlider } from "@urcolor/react"; // [!code ++]

function MySlider() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    // [!code ++:7]
    <ColorSlider.Root
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      channel="h"
    >
      {/* children go here */}
    </ColorSlider.Root>
  );
}
```

- `colorSpace` — the color space to work in (`hsl`, `oklch`, `hsb`, etc.)
- `channel` — the channel this slider controls (`h`, `s`, `l`, `hue`, `chroma`, etc.)

## Step 3: Add the track and gradient

`ColorSlider.Control` is the interactive area that handles pointer events. `ColorSlider.Track` wraps the visual track. `ColorSlider.Gradient` renders the 1D gradient on a canvas.

```tsx
import { useColor, ColorSlider } from "@urcolor/react";

function MySlider() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    <ColorSlider.Root
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      channel="h"
    >
      {/* [!code ++:10] */}
      <ColorSlider.Control>
        <ColorSlider.Track
          className="relative h-5 overflow-hidden rounded-xl"
        >
          <ColorSlider.Gradient
            className="absolute inset-0 rounded-xl"
            colors={["red", "yellow", "lime", "cyan", "blue", "magenta", "red"]}
          />
        </ColorSlider.Track>
      </ColorSlider.Control>
    </ColorSlider.Root>
  );
}
```

The `colors` prop defines the gradient stops. For a hue slider, use the full spectrum. For other channels, you can use fewer stops — the gradient will interpolate between them.

## Step 4: Add the thumb

`ColorSlider.Thumb` is the draggable handle. It's positioned automatically by the component.

```tsx
import { useColor, ColorSlider } from "@urcolor/react";

function MySlider() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    <ColorSlider.Root
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      channel="h"
    >
      <ColorSlider.Control>
        <ColorSlider.Track className="relative h-5 overflow-hidden rounded-xl">
          <ColorSlider.Gradient
            className="absolute inset-0 rounded-xl"
            colors={["red", "yellow", "lime", "cyan", "blue", "magenta", "red"]}
          />
          {/* [!code ++:8] */}
          <ColorSlider.Thumb
            className="
              block size-5 rounded-full border-[2.5px] border-white bg-white
              shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
              focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
            "
            aria-label="Hue"
          />
        </ColorSlider.Track>
      </ColorSlider.Control>
    </ColorSlider.Root>
  );
}
```

::: tip
All components are completely unstyled — the classes above are just an example using Tailwind CSS. Use any styling approach you prefer.
:::

## Vertical orientation

Set `orientation="vertical"` to render a vertical slider:

```tsx{5}
<ColorSlider.Root
  value={color}
  onValueChange={setColor}
  colorSpace="hsl"
  orientation="vertical"
  channel="h"
>
  {/* ... */}
</ColorSlider.Root>
```

## Inverting direction

Use `inverted` to reverse the slider direction:

```tsx{5}
<ColorSlider.Root
  value={color}
  onValueChange={setColor}
  colorSpace="hsl"
  inverted
  channel="h"
>
  {/* ... */}
</ColorSlider.Root>
```

## Different channels

Switch the `channel` prop to control different color properties. For example, a lightness slider:

```tsx{5,12}
<ColorSlider.Root
  value={color}
  onValueChange={setColor}
  colorSpace="hsl"
  channel="l"
>
  <ColorSlider.Control>
    <ColorSlider.Track className="relative h-5 overflow-hidden rounded-xl">
      <ColorSlider.Gradient
        className="absolute inset-0 rounded-xl"
        colors={["black", "hsl(210, 80%, 50%)", "white"]}
      />
      <ColorSlider.Thumb
        className="..."
        aria-label="Lightness"
      />
    </ColorSlider.Track>
  </ColorSlider.Control>
</ColorSlider.Root>
```

## Listening to changes

Use `onValueChange` for real-time updates (while dragging) and `onValueCommit` for the final value (on release):

```tsx{3-8,15-16}
import { Color } from "internationalized-color";

const onColorChange = (color: Color) => {
  console.log("dragging", color.toString("css"));
};
const onColorCommit = (color: Color) => {
  console.log("committed", color.toString("css"));
};

<ColorSlider.Root
  value={color}
  onValueChange={onColorChange}
  onValueCommit={onColorCommit}
  colorSpace="hsl"
  channel="h"
>
  {/* ... */}
</ColorSlider.Root>
```

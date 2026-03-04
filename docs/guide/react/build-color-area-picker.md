# Build Color Area Picker

Let's build a 2D color area picker step by step.

<script setup>
import ReactMount from '../../components/ReactMount.vue'
import ColorAreaGuide from './demo/ColorAreaGuide.tsx'
</script>

Here's what we'll end up with:

<ReactMount :component="ColorAreaGuide" />


<details>
<summary>Click to view the full code</summary>

::: code-group

<<< @/guide/react/demo/ColorAreaGuide.tsx

:::

</details>

## Step 1: Set up state

Start by importing the color hook and creating color state.

```tsx
import { useColor } from "@urcolor/react"; // [!code ++]

function MyArea() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)"); // [!code ++]
}
```

## Step 2: Add the root

`ColorArea.Root` manages all the state and interactions. Tell it which color space and channels to use for each axis.

```tsx
import { useColor, ColorArea } from "@urcolor/react"; // [!code ++]

function MyArea() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    // [!code ++:8]
    <ColorArea.Root
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      channelX="h"
      channelY="s"
    >
      {/* children go here */}
    </ColorArea.Root>
  );
}
```

- `colorSpace` — the color space to work in (`hsl`, `oklch`, `hsb`, etc.)
- `channelX` — the channel mapped to the horizontal axis
- `channelY` — the channel mapped to the vertical axis

## Step 3: Add the track and gradient

`ColorArea.Track` is the interactive area that handles pointer events. `ColorArea.Gradient` renders the 2D gradient on a canvas.

```tsx
import { useColor, ColorArea } from "@urcolor/react";

function MyArea() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    <ColorArea.Root
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      channelX="h"
      channelY="s"
    >
      {/* [!code ++:7] */}
      <ColorArea.Track
        className="
          relative h-[200px] w-full cursor-crosshair
          touch-none overflow-clip rounded-lg
        "
      >
        <ColorArea.Gradient className="absolute inset-0" />
      </ColorArea.Track>
    </ColorArea.Root>
  );
}
```

The track needs a fixed height and `position: relative` so the thumb can be positioned inside it. `touch-none` prevents scroll interference on mobile.

## Step 4: Add the thumb

`ColorArea.Thumb` is the draggable handle. It's positioned automatically by the component.

```tsx
import { useColor, ColorArea } from "@urcolor/react";

function MyArea() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    <ColorArea.Root
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      channelX="h"
      channelY="s"
    >
      <ColorArea.Track
        className="
          relative h-[200px] w-full cursor-crosshair
          touch-none overflow-clip rounded-lg
        "
      >
        <ColorArea.Gradient className="absolute inset-0" />
        {/* [!code ++:8] */}
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
```

::: tip
All components are completely unstyled — the classes above are just an example using Tailwind CSS. Use any styling approach you prefer.
:::

## Switching color spaces

Change the color space and channel mapping for different picker behavior. For example, OKLCh:

```tsx{5,11-13}
const { color, setColor } = useColor("oklch(0.6, 0.15, 210)");

<ColorArea.Root
  value={color}
  onValueChange={setColor}
  colorSpace="oklch"
  channelX="hue"
  channelY="chroma"
>
  {/* ... */}
</ColorArea.Root>
```

## Inverting axis direction

Use `invertedX` or `invertedY` to reverse axis directions:

```tsx{7-8}
<ColorArea.Root
  value={color}
  onValueChange={setColor}
  colorSpace="hsl"
  channelX="h"
  channelY="l"
  invertedX
  invertedY
>
  {/* ... */}
</ColorArea.Root>
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

<ColorArea.Root
  value={color}
  onValueChange={onColorChange}
  onValueCommit={onColorCommit}
  colorSpace="hsl"
  channelX="h"
  channelY="s"
>
  {/* ... */}
</ColorArea.Root>
```

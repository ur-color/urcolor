# Build Color Ring

Let's build a circular hue ring step by step.

<script setup>
import ReactMount from '../../components/ReactMount.vue'
import ColorRingGuide from './demo/ColorRingGuide.tsx'
</script>

Here's what we'll end up with:

<ReactMount :component="ColorRingGuide" />


<details>
<summary>Click to view the full code</summary>

::: code-group

<<< @/guide/react/demo/ColorRingGuide.tsx

:::

</details>

## Step 1: Set up state

Start by importing the color hook and creating color state.

```tsx
import { useColor } from "@urcolor/react"; // [!code ++]

function MyRing() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)"); // [!code ++]
}
```

## Step 2: Add the root

`ColorRing.Root` manages all the state and interactions. Tell it which color space and channel to control.

```tsx
import { useColor, ColorRing } from "@urcolor/react"; // [!code ++]

function MyRing() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    // [!code ++:8]
    <ColorRing.Root
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      channel="h"
      innerRadius={0.85}
    >
      {/* children go here */}
    </ColorRing.Root>
  );
}
```

- `colorSpace` — the color space to work in (`hsl`, `oklch`, `hsb`, etc.)
- `channel` — the channel this ring controls (`h`, `s`, `l`, `hue`, `chroma`, etc.)
- `innerRadius` — the inner radius as a fraction of the outer radius (`0`–`1`), controls ring thickness

## Step 3: Add the track and gradient

`ColorRing.Track` is the interactive area. `ColorRing.Gradient` renders the circular gradient on a canvas.

```tsx
import { useColor, ColorRing } from "@urcolor/react";

function MyRing() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    <ColorRing.Root
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      channel="h"
      innerRadius={0.85}
      className="relative block size-64"
      style={{ containerType: "inline-size" }}
    >
      {/* [!code ++:4] */}
      <ColorRing.Track className="relative block size-full">
        <ColorRing.Gradient className="absolute inset-0 block" />
      </ColorRing.Track>
    </ColorRing.Root>
  );
}
```

The root needs `container-type: inline-size` so the component can calculate dimensions correctly.

## Step 4: Add the thumb

`ColorRing.Thumb` is the draggable handle. It's positioned automatically along the ring.

```tsx
import { useColor, ColorRing } from "@urcolor/react";

function MyRing() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    <ColorRing.Root
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      channel="h"
      innerRadius={0.85}
      className="relative block size-64"
      style={{ containerType: "inline-size" }}
    >
      <ColorRing.Track className="relative block size-full">
        <ColorRing.Gradient className="absolute inset-0 block" />
        {/* [!code ++:8] */}
        <ColorRing.Thumb
          className="
            size-4 rounded-full border-2 border-white
            shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
            focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
          "
          aria-label="Hue"
        />
      </ColorRing.Track>
    </ColorRing.Root>
  );
}
```

::: tip
All components are completely unstyled — the classes above are just an example using Tailwind CSS. Use any styling approach you prefer.
:::

## Adjusting ring thickness

Use the `innerRadius` prop to control the ring thickness. `0` gives a full circle, `0.9` gives a thin ring:

```tsx{5}
<ColorRing.Root
  value={color}
  onValueChange={setColor}
  colorSpace="hsl"
  innerRadius={0.7}
  channel="h"
>
  {/* ... */}
</ColorRing.Root>
```

## Changing start angle

Use `startAngle` to rotate where the ring gradient begins (in degrees):

```tsx{5}
<ColorRing.Root
  value={color}
  onValueChange={setColor}
  colorSpace="hsl"
  startAngle={90}
  channel="h"
>
  {/* ... */}
</ColorRing.Root>
```

## Different channels

Switch the `channel` prop to control different color properties. For example, a saturation ring:

```tsx{5}
<ColorRing.Root
  value={color}
  onValueChange={setColor}
  colorSpace="hsl"
  channel="s"
>
  {/* ... */}
</ColorRing.Root>
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

<ColorRing.Root
  value={color}
  onValueChange={onColorChange}
  onValueCommit={onColorCommit}
  colorSpace="hsl"
  channel="h"
>
  {/* ... */}
</ColorRing.Root>
```

# Build Color Triangle

Let's build a triangular color picker step by step.

<script setup>
import ColorTriangleGuide from './demo/ColorTriangleGuide.vue'
</script>

Here's what we'll end up with:

<ColorTriangleGuide />


<details>
<summary>Click to view the full code</summary>

::: code-group

<<< @/guide/vue/demo/ColorTriangleGuide.vue

:::

</details>

## Step 1: Set up state

Start by importing the color model and creating a reactive color value.

```vue
<script setup lang="ts">
import { useColor } from "@urcolor/vue";  // [!code ++]

const { color } = useColor("hsl(210, 80%, 50%)");  // [!code ++]
</script>
```

`useColor()` creates a reactive color ref from any CSS color string. It returns a `{ color }` object where `color` is a shallow ref holding the parsed `Color` instance.

## Step 2: Add the root

`ColorTriangleRoot` manages all the state and interactions. Tell it which color space and channels to map to the triangle axes.

```vue
<script setup lang="ts">
import { useColor, ColorTriangleRoot } from "@urcolor/vue"; // [!code ++]

const { color } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <!-- [!code ++:8] -->
  <ColorTriangleRoot
    v-model="color"
    color-space="hsv"
    x-channel="s"
    y-channel="v"
  >
    <!-- children go here -->
  </ColorTriangleRoot>
</template>
```

- `color-space` — the color space to work in (`hsv`, `hsl`, `rgb`, etc.)
- `x-channel` — the channel mapped to the horizontal axis
- `y-channel` — the channel mapped to the vertical axis

## Step 3: Add the gradient

`ColorTriangleGradient` renders the 2D gradient inside the triangular shape.

```vue
<script setup lang="ts">
import {
  useColor,
  ColorTriangleRoot,
  ColorTriangleGradient, // [!code ++]
} from "@urcolor/vue";

const { color } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <ColorTriangleRoot
    v-model="color"
    color-space="hsv"
    x-channel="s"
    y-channel="v"
    class="relative block size-64"
  >
    <ColorTriangleGradient class="absolute inset-0 block" /> <!-- [!code ++] -->
  </ColorTriangleRoot>
</template>
```

## Step 4: Add the thumb

`ColorTriangleThumb` is the draggable handle. It's positioned automatically within the triangle.

```vue
<script setup lang="ts">
import {
  useColor,
  ColorTriangleRoot,
  ColorTriangleGradient,
  ColorTriangleThumb, // [!code ++]
} from "@urcolor/vue";

const { color } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <ColorTriangleRoot
    v-model="color"
    color-space="hsv"
    x-channel="s"
    y-channel="v"
    class="relative block size-64"
  >
    <ColorTriangleGradient class="absolute inset-0 block" />
    <!-- [!code ++:8] -->
    <ColorTriangleThumb
      class="
        size-4 rounded-full border-2 border-white
        shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
        focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
      "
      aria-label="Color"
    />
  </ColorTriangleRoot>
</template>
```

::: tip
All components are completely unstyled — the classes above are just an example using Tailwind CSS. Use any styling approach you prefer.
:::

## Rotation

Use the `rotation` prop to rotate the triangle (in degrees):

```vue{5}
<template>
  <ColorTriangleRoot
    v-model="color"
    color-space="hsv"
    :rotation="180"
    x-channel="s"
    y-channel="v"
  >
    <!-- ... -->
  </ColorTriangleRoot>
</template>
```

## Three-channel mode

Add `z-channel` to enable barycentric three-channel mode. This maps all three channels to the triangle's vertices — useful for RGB color mixing:

```vue{4-6}
<template>
  <ColorTriangleRoot
    v-model="color"
    color-space="srgb"
    x-channel="r"
    y-channel="g"
    z-channel="b"
  >
    <!-- ... -->
  </ColorTriangleRoot>
</template>
```

::: info The first keypress "jumps"
In three-channel mode the values are barycentric coordinates — only the ratio
between them is meaningful — so every write is renormalized back onto the simplex.
A color at `50 / 50 / 180` therefore becomes `33 / 33 / 120` the first time you
step it. That is inherent to the geometry, not a bug; from then on the values move
smoothly.
:::

Keyboard control follows the same axes as `ColorArea`: Arrow Left/Right step X,
Arrow Up/Down step Y, and — in three-channel mode only — Page Up/Page Down step Z.
Hold Shift for ten steps at a time.

## Listening to changes

Use `@update:model-value` for real-time updates (while dragging) and `@change-end` for the final value (on release):

```vue{3-8,15-16}
<script setup lang="ts">
// ...
const onColorChange = (color: Color) => {
  console.log("dragging", color.toString());
};
const onColorChangeEnd = (color: Color) => {
  console.log("committed", color.toString());
};
</script>

<template>
  <ColorTriangleRoot
    v-model="color"
    color-space="hsv"
    @update:model-value="onColorChange"
    @change-end="onColorChangeEnd"
    x-channel="s"
    y-channel="v"
  >
    <!-- ... -->
  </ColorTriangleRoot>
</template>
```

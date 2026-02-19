# Build Color Triangle

Let's build a triangular color picker step by step.

<script setup>
import ColorTriangleGuide from './demo/ColorTriangleGuide.vue'
</script>

Here's what we'll end up with:

<ColorTriangleGuide />

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
    channel-x="s"
    channel-y="v"
  >
    <!-- children go here -->
  </ColorTriangleRoot>
</template>
```

- `color-space` — the color space to work in (`hsv`, `hsl`, `rgb`, etc.)
- `channel-x` — the channel mapped to the horizontal axis
- `channel-y` — the channel mapped to the vertical axis

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
    channel-x="s"
    channel-y="v"
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
    channel-x="s"
    channel-y="v"
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
    channel-x="s"
    channel-y="v"
  >
    <!-- ... -->
  </ColorTriangleRoot>
</template>
```

## Three-channel mode

Add `channel-z` to enable barycentric three-channel mode. This maps all three channels to the triangle's vertices — useful for RGB color mixing:

```vue{4-6}
<template>
  <ColorTriangleRoot
    v-model="color"
    color-space="rgb"
    channel-x="r"
    channel-y="g"
    channel-z="b"
  >
    <!-- ... -->
  </ColorTriangleRoot>
</template>
```

## Listening to changes

Use `@update:model-value` for real-time updates (while dragging) and `@value-commit` for the final value (on release):

```vue{3-8,15-16}
<script setup lang="ts">
// ...
const onColorChange = (color: Color) => {
  console.log("dragging", color.toString("css"));
};
const onColorCommit = (color: Color) => {
  console.log("committed", color.toString("css"));
};
</script>

<template>
  <ColorTriangleRoot
    v-model="color"
    color-space="hsv"
    @update:model-value="onColorChange"
    @value-commit="onColorCommit"
    channel-x="s"
    channel-y="v"
  >
    <!-- ... -->
  </ColorTriangleRoot>
</template>
```

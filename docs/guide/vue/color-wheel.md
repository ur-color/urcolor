# Build a Color Wheel

Let's build a 2D color wheel step by step.

<script setup>
import ColorWheelGuide from './demo/ColorWheelGuide.vue'
</script>

Here's what we'll end up with:

<ColorWheelGuide />

## Step 1: Set up state

Start by importing the color model and creating a reactive color value.

```vue
<script setup lang="ts">
import { shallowRef } from "vue";  // [!code ++]
import { Color } from "internationalized-color";  // [!code ++]

const color = shallowRef(Color.parse("hsl(210, 80%, 50%)")!);  // [!code ++]
</script>
```

`Color.parse()` creates a color object from any CSS color string. We use `shallowRef` since `Color` is an immutable object — no deep reactivity needed.

## Step 2: Add the root

`ColorWheelRoot` manages all the state and interactions. Tell it which color space and channels to map to the angle and radius.

```vue
<script setup lang="ts">
import { shallowRef } from "vue";
import { Color } from "internationalized-color";
import { ColorWheelRoot } from "@urcolor/vue"; // [!code ++]

const color = shallowRef(Color.parse("hsl(210, 80%, 50%)")!);
</script>

<template>
  <!-- [!code ++:8] -->
  <ColorWheelRoot
    v-model="color"
    color-space="hsl"
    channel-angle="h"
    channel-radius="s"
  >
    <!-- children go here -->
  </ColorWheelRoot>
</template>
```

- `color-space` — the color space to work in (`hsl`, `oklch`, etc.)
- `channel-angle` — the channel mapped to the angular axis (rotation)
- `channel-radius` — the channel mapped to the radial axis (distance from center)

## Step 3: Add the gradient

`ColorWheelGradient` renders the 2D circular gradient on a canvas.

```vue
<script setup lang="ts">
import { shallowRef } from "vue";
import { Color } from "internationalized-color";
import {
  ColorWheelRoot,
  ColorWheelGradient, // [!code ++]
} from "@urcolor/vue";

const color = shallowRef(Color.parse("hsl(210, 80%, 50%)")!);
</script>

<template>
  <ColorWheelRoot
    v-model="color"
    color-space="hsl"
    channel-angle="h"
    channel-radius="s"
    class="relative block size-64 overflow-hidden rounded-full"
    style="container-type: inline-size"
  >
    <ColorWheelGradient class="absolute inset-0 block" /> <!-- [!code ++] -->
  </ColorWheelRoot>
</template>
```

The root needs `overflow-hidden rounded-full` to clip the gradient to a circle, and `container-type: inline-size` so the component can calculate dimensions correctly.

## Step 4: Add the thumb

`ColorWheelThumb` is the draggable handle. It's positioned automatically within the wheel.

```vue
<script setup lang="ts">
import { shallowRef } from "vue";
import { Color } from "internationalized-color";
import {
  ColorWheelRoot,
  ColorWheelGradient,
  ColorWheelThumb, // [!code ++]
} from "@urcolor/vue";

const color = shallowRef(Color.parse("hsl(210, 80%, 50%)")!);
</script>

<template>
  <ColorWheelRoot
    v-model="color"
    color-space="hsl"
    channel-angle="h"
    channel-radius="s"
    class="relative block size-64 overflow-hidden rounded-full"
    style="container-type: inline-size"
  >
    <ColorWheelGradient class="absolute inset-0 block" />
    <!-- [!code ++:8] -->
    <ColorWheelThumb
      class="
        size-4 rounded-full border-2 border-white
        shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
        focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
      "
      aria-label="Color"
    />
  </ColorWheelRoot>
</template>
```

::: tip
All components are completely unstyled — the classes above are just an example using Tailwind CSS. Use any styling approach you prefer.
:::

## Start angle offset

Use `start-angle` to rotate where the wheel gradient begins (in degrees):

```vue{5}
<template>
  <ColorWheelRoot
    v-model="color"
    color-space="hsl"
    :start-angle="90"
    channel-angle="h"
    channel-radius="s"
  >
    <!-- ... -->
  </ColorWheelRoot>
</template>
```

## Different color spaces

Switch the color space and channel mapping for different wheel behaviors. For example, OKLCh:

```vue{5,11-13}
<script setup lang="ts">
import { shallowRef } from "vue";
import { Color } from "internationalized-color";

const color = shallowRef(Color.parse("oklch(0.6, 0.15, 210)")!);
</script>

<template>
  <ColorWheelRoot
    v-model="color"
    color-space="oklch"
    channel-angle="hue"
    channel-radius="chroma"
  >
    <!-- ... -->
  </ColorWheelRoot>
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
  <ColorWheelRoot
    v-model="color"
    color-space="hsl"
    @update:model-value="onColorChange"
    @value-commit="onColorCommit"
    channel-angle="h"
    channel-radius="s"
  >
    <!-- ... -->
  </ColorWheelRoot>
</template>
```

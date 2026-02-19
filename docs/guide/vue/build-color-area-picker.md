# Build Color Area Picker

Let's build a 2D color area picker step by step.

<script setup>
import ColorAreaGuide from './demo/ColorAreaGuide.vue'
</script>

Here's what we'll end up with:

<ColorAreaGuide />

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

`ColorAreaRoot` manages all the state and interactions. Tell it which color space and channels to use for each axis.

```vue
<script setup lang="ts">
import { useColor, ColorAreaRoot } from "@urcolor/vue"; // [!code ++]

const { color } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <!-- [!code ++:8] -->
  <ColorAreaRoot
    v-model="color"
    color-space="hsl"
    channel-x="h"
    channel-y="s"
  >
    <!-- children go here -->
  </ColorAreaRoot>
</template>
```

- `color-space` — the color space to work in (`hsl`, `oklch`, `hsb`, etc.)
- `channel-x` — the channel mapped to the horizontal axis
- `channel-y` — the channel mapped to the vertical axis

## Step 3: Add the track and gradient

`ColorAreaTrack` is the interactive area that handles pointer events. `ColorAreaGradient` renders the 2D gradient on a canvas.

```vue
<script setup lang="ts">
import {
  useColor,
  ColorAreaRoot,
  ColorAreaTrack, // [!code ++]
  ColorAreaGradient, // [!code ++]
} from "@urcolor/vue";

const { color } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <ColorAreaRoot
    v-model="color"
    color-space="hsl"
    channel-x="h"
    channel-y="s"
  >
    <!-- [!code ++:9] -->
    <ColorAreaTrack
      class="
        relative h-[200px] w-full cursor-crosshair
        touch-none overflow-clip rounded-lg
      "
    >
      <ColorAreaGradient class="absolute inset-0" />
    </ColorAreaTrack>
  </ColorAreaRoot>
</template>
```

The track needs a fixed height and `position: relative` so the thumb can be positioned inside it. `touch-none` prevents scroll interference on mobile.

## Step 4: Add the thumb

The thumb is composed of three parts: `ColorAreaThumb` (the visible, styled handle), `ColorAreaThumbX` and `ColorAreaThumbY` (hidden inputs that provide accessible `role="slider"` for each axis).

You only need to style `ColorAreaThumb` — the inner X/Y elements can be left unstyled.

```vue
<script setup lang="ts">
import {
  useColor,
  ColorAreaRoot,
  ColorAreaTrack,
  ColorAreaGradient,
  ColorAreaThumb, // [!code ++]
  ColorAreaThumbX, // [!code ++]
  ColorAreaThumbY, // [!code ++]
} from "@urcolor/vue";

const { color } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <ColorAreaRoot
    v-model="color"
    color-space="hsl"
    channel-x="h"
    channel-y="s"
  >
    <ColorAreaTrack
      class="
        relative h-[200px] w-full cursor-crosshair
        touch-none overflow-clip rounded-lg
      "
    >
      <ColorAreaGradient class="absolute inset-0" />
      <!-- [!code ++:11] -->
      <ColorAreaThumb
        class="
          absolute size-5 transform-(--reka-slider-area-thumb-transform)
          rounded-full border-2 border-white
          shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
        "
      >
        <ColorAreaThumbX class="outline-none" />
        <ColorAreaThumbY class="outline-none" />
      </ColorAreaThumb>
    </ColorAreaTrack>
  </ColorAreaRoot>
</template>
```

- `transform-(--reka-slider-area-thumb-transform)` — a CSS variable set by the component to position the thumb at the correct coordinates
- `ColorAreaThumbX` and `ColorAreaThumbY` are visually hidden by default — they provide separate `role="slider"` elements for screen readers to navigate each axis independently

::: tip
All components are completely unstyled — the classes above are just an example using Tailwind CSS. Use any styling approach you prefer.
:::

## Switching color spaces

You can change the color space and channel mapping to get completely different picker behavior. For example, switch from HSL to OKLCh:

```vue{5,11-13}
<script setup lang="ts">
import { useColor } from "@urcolor/vue";

const { color } = useColor("oklch(0.6, 0.15, 210)");
</script>

<template>
  <ColorAreaRoot
    v-model="color"
    color-space="oklch"
    channel-x="hue"
    channel-y="chroma"
  >
    <!-- ... -->
  </ColorAreaRoot>
</template>
```

Or map different HSL channels to create a saturation × lightness picker:

```vue{5,6}
<template>
  <ColorAreaRoot
    v-model="color"
    color-space="hsl"
    channel-x="s"
    channel-y="l"
  >
    <!-- ... -->
  </ColorAreaRoot>
</template>
```

## Inverting axis direction

You can reverse the direction of the horizontal or vertical axes using the `inverted-x` or `inverted-y` props. This is useful when you want the color area to map from right-to-left (for x) or bottom-to-top (for y) instead of the default direction.

```vue{7-8}
<template>
  <ColorAreaRoot
    v-model="color"
    color-space="hsl"
    channel-x="h"
    channel-y="l"
    :inverted-x="true"
    :inverted-y="true"
  >
    <!-- ... -->
  </ColorAreaRoot>
</template>
```

## Listening to changes

Use `@update:model-value` for real-time updates (while dragging) and `@value-commit` for the final value (on release):

```vue{3-8,17-18}
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
  <ColorAreaRoot
    v-model="color"
    color-space="hsl"
    channel-x="h"
    channel-y="s"
    @update:model-value="onColorChange"
    @value-commit="onColorCommit"
  >
    <!-- ... -->
  </ColorAreaRoot>
</template>
```

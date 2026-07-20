# Build Color Area Picker

Let's build a 2D color area picker step by step.

<script setup>
import ColorAreaGuide from './demo/ColorAreaGuide.vue'
</script>

Here's what we'll end up with:

<ColorAreaGuide />


<details>
<summary>Click to view the full code</summary>

::: code-group

<<< @/guide/vue/demo/ColorAreaGuide.vue

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

`ColorAreaRoot` manages all the state and interactions. Tell it which color space and channels to use for each axis.

```vue
<script setup lang="ts">
import { useColor, ColorAreaRoot } from "@urcolor/vue"; // [!code ++]

const { color } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <!-- [!code ++:9] -->
  <ColorAreaRoot
    v-model="color"
    color-space="hsl"
    x-channel="h"
    y-channel="s"
    as="div"
  >
    <!-- children go here -->
  </ColorAreaRoot>
</template>
```

- `color-space` — the color space to work in (`hsl`, `oklch`, `hsv`, etc.)
- `x-channel` — the channel mapped to the horizontal axis
- `y-channel` — the channel mapped to the vertical axis

## Step 3: Add the area

`ColorAreaArea` is the interaction surface. The root owns the state and the value
maths, but every pointer and keyboard listener lives here — and this is the element
the pointer coordinates are measured against. Everything else goes inside it.

```vue
<script setup lang="ts">
import {
  useColor,
  ColorAreaRoot,
  ColorAreaArea, // [!code ++]
} from "@urcolor/vue";

const { color } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <ColorAreaRoot
    v-model="color"
    color-space="hsl"
    x-channel="h"
    y-channel="s"
    as="div"
    class="
      relative block h-[200px] w-full cursor-crosshair
      touch-none overflow-clip rounded-lg
    "
  >
    <!-- [!code ++:3] -->
    <ColorAreaArea as="div" class="absolute inset-0">
      <!-- gradient and thumb go here -->
    </ColorAreaArea>
  </ColorAreaRoot>
</template>
```

The root needs a fixed height and `position: relative` so the thumb can be positioned inside it. `touch-none` prevents scroll interference on mobile.

::: warning
Without `ColorAreaArea` the picker still renders, but it will not respond to
clicks, drags or arrow keys — the root attaches no handlers of its own.
:::

## Step 4: Add the gradient

`ColorAreaGradient` renders the 2D gradient on a canvas.

```vue
<script setup lang="ts">
import {
  useColor,
  ColorAreaRoot,
  ColorAreaArea,
  ColorAreaGradient, // [!code ++]
} from "@urcolor/vue";

const { color } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <ColorAreaRoot
    v-model="color"
    color-space="hsl"
    x-channel="h"
    y-channel="s"
    as="div"
    class="
      relative block h-[200px] w-full cursor-crosshair
      touch-none overflow-clip rounded-lg
    "
  >
    <ColorAreaArea as="div" class="absolute inset-0">
      <ColorAreaGradient as="div" class="absolute inset-0" /> <!-- [!code ++] -->
    </ColorAreaArea>
  </ColorAreaRoot>
</template>
```

## Step 5: Add the thumb

`ColorAreaThumb` is the visible, styled handle. It is the picker's single focusable
element and carries `role="slider"` for screen readers.

```vue
<script setup lang="ts">
import {
  useColor,
  ColorAreaRoot,
  ColorAreaArea,
  ColorAreaGradient,
  ColorAreaThumb, // [!code ++]
} from "@urcolor/vue";

const { color } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <ColorAreaRoot
    v-model="color"
    color-space="hsl"
    x-channel="h"
    y-channel="s"
    as="div"
    class="
      relative block h-[200px] w-full cursor-crosshair
      touch-none overflow-clip rounded-lg
    "
  >
    <ColorAreaArea as="div" class="absolute inset-0">
      <ColorAreaGradient as="div" class="absolute inset-0" />
      <!-- [!code ++:8] -->
      <ColorAreaThumb
        as="div"
        class="
          absolute size-5 transform-(--reka-slider-area-thumb-transform)
          rounded-full border-2 border-white
          shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
        "
      />
    </ColorAreaArea>
  </ColorAreaRoot>
</template>
```

- `transform-(--reka-slider-area-thumb-transform)` — a CSS variable set by the component to position the thumb at the correct coordinates

::: tip
All components are completely unstyled — the classes above are just an example using Tailwind CSS. Use any styling approach you prefer.
:::

## Switching color spaces

You can change the color space and channel mapping to get completely different picker behavior. For example, switch from HSL to OKLCh:

```vue{5,11-13}
<script setup lang="ts">
import { useColor } from "@urcolor/vue";

const { color } = useColor("oklch(0.6 0.15 210)");
</script>

<template>
  <ColorAreaRoot
    v-model="color"
    color-space="oklch"
    x-channel="c"
    y-channel="l"
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
    x-channel="s"
    y-channel="l"
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
    x-channel="h"
    y-channel="l"
    :inverted-x="true"
    :inverted-y="true"
  >
    <!-- ... -->
  </ColorAreaRoot>
</template>
```

## Listening to changes

Use `@change` for real-time updates (it fires on every change, including mid-drag) and `@change-end` for the final value (on release):

```vue{3-8,17-18}
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
  <ColorAreaRoot
    v-model="color"
    color-space="hsl"
    x-channel="h"
    y-channel="s"
    @change="onColorChange"
    @change-end="onColorChangeEnd"
  >
    <!-- ... -->
  </ColorAreaRoot>
</template>
```

`@update:model-value` and `@update:color` fire alongside `@change`; use whichever
suits your binding style.

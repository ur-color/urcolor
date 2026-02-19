# Build Color Ring

Let's build a circular hue ring step by step.

<script setup>
import ColorRingGuide from './demo/ColorRingGuide.vue'
</script>

Here's what we'll end up with:

<ColorRingGuide />

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

`ColorRingRoot` manages all the state and interactions. Tell it which color space and channel to control.

```vue
<script setup lang="ts">
import { useColor, ColorRingRoot } from "@urcolor/vue"; // [!code ++]

const { color } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <!-- [!code ++:8] -->
  <ColorRingRoot
    v-model="color"
    color-space="hsl"
    channel="h"
    :inner-radius="0.85"
  >
    <!-- children go here -->
  </ColorRingRoot>
</template>
```

- `color-space` — the color space to work in (`hsl`, `oklch`, `hsb`, etc.)
- `channel` — the channel this ring controls (`h`, `s`, `l`, `hue`, `chroma`, etc.)
- `inner-radius` — the inner radius as a fraction of the outer radius (`0`–`1`), controls ring thickness

## Step 3: Add the track and gradient

`ColorRingTrack` is the interactive area that handles pointer events. `ColorRingGradient` renders the circular gradient on a canvas.

```vue
<script setup lang="ts">
import {
  useColor,
  ColorRingRoot,
  ColorRingTrack, // [!code ++]
  ColorRingGradient, // [!code ++]
} from "@urcolor/vue";

const { color } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <ColorRingRoot
    v-model="color"
    color-space="hsl"
    channel="h"
    :inner-radius="0.85"
    class="relative block size-64"
    style="container-type: inline-size"
  >
    <!-- [!code ++:4] -->
    <ColorRingTrack class="relative block size-full">
      <ColorRingGradient class="absolute inset-0 block" />
    </ColorRingTrack>
  </ColorRingRoot>
</template>
```

The root needs `container-type: inline-size` so the component can calculate dimensions correctly.

## Step 4: Add the thumb

`ColorRingThumb` is the draggable handle. It's positioned automatically along the ring.

```vue
<script setup lang="ts">
import {
  useColor,
  ColorRingRoot,
  ColorRingTrack,
  ColorRingGradient,
  ColorRingThumb, // [!code ++]
} from "@urcolor/vue";

const { color } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <ColorRingRoot
    v-model="color"
    color-space="hsl"
    channel="h"
    :inner-radius="0.85"
    class="relative block size-64"
    style="container-type: inline-size"
  >
    <ColorRingTrack class="relative block size-full">
      <ColorRingGradient class="absolute inset-0 block" />
      <!-- [!code ++:8] -->
      <ColorRingThumb
        class="
          size-4 rounded-full border-2 border-white
          shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
          focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
        "
        aria-label="Hue"
      />
    </ColorRingTrack>
  </ColorRingRoot>
</template>
```

::: tip
All components are completely unstyled — the classes above are just an example using Tailwind CSS. Use any styling approach you prefer.
:::

## Adjusting ring thickness

Use the `inner-radius` prop to control the ring thickness. The value is a fraction of the outer radius — `0` gives a full circle, `0.9` gives a thin ring:

```vue{5}
<template>
  <ColorRingRoot
    v-model="color"
    color-space="hsl"
    :inner-radius="0.7"
    channel="h"
  >
    <!-- ... -->
  </ColorRingRoot>
</template>
```

## Changing start angle

Use `start-angle` to rotate where the ring gradient begins (in degrees):

```vue{5}
<template>
  <ColorRingRoot
    v-model="color"
    color-space="hsl"
    :start-angle="90"
    channel="h"
  >
    <!-- ... -->
  </ColorRingRoot>
</template>
```

## Different channels

Switch the `channel` prop to control different color properties. For example, a saturation ring:

```vue{5}
<template>
  <ColorRingRoot
    v-model="color"
    color-space="hsl"
    channel="s"
  >
    <!-- ... -->
  </ColorRingRoot>
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
  <ColorRingRoot
    v-model="color"
    color-space="hsl"
    @update:model-value="onColorChange"
    @value-commit="onColorCommit"
    channel="h"
  >
    <!-- ... -->
  </ColorRingRoot>
</template>
```

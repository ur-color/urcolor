# Build a Color Slider

Let's build a 1D color slider step by step.

<script setup>
import ColorSliderGuide from './demo/ColorSliderGuide.vue'
</script>

Here's what we'll end up with:

<ColorSliderGuide />

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

`ColorSliderRoot` manages all the state and interactions. Tell it which color space and channel to control.

```vue
<script setup lang="ts">
import { shallowRef } from "vue";
import { Color } from "internationalized-color";
import { ColorSliderRoot } from "@urcolor/vue"; // [!code ++]

const color = shallowRef(Color.parse("hsl(210, 80%, 50%)")!);
</script>

<template>
  <!-- [!code ++:7] -->
  <ColorSliderRoot
    v-model="color"
    color-space="hsl"
    channel="h"
  >
    <!-- children go here -->
  </ColorSliderRoot>
</template>
```

- `color-space` — the color space to work in (`hsl`, `oklch`, `hsb`, etc.)
- `channel` — the channel this slider controls (`h`, `s`, `l`, `hue`, `chroma`, etc.)

## Step 3: Add the track and gradient

`ColorSliderTrack` is the interactive area that handles pointer events. `ColorSliderGradient` renders the 1D gradient on a canvas.

```vue
<script setup lang="ts">
import { shallowRef } from "vue";
import { Color } from "internationalized-color";
import {
  ColorSliderRoot,
  ColorSliderTrack, // [!code ++]
  ColorSliderGradient, // [!code ++]
} from "@urcolor/vue";

const color = shallowRef(Color.parse("hsl(210, 80%, 50%)")!);
</script>

<template>
  <ColorSliderRoot
    v-model="color"
    color-space="hsl"
    channel="h"
  >
    <!-- [!code ++:8] -->
    <ColorSliderTrack
      class="relative h-5 overflow-hidden rounded-xl"
    >
      <ColorSliderGradient
        class="absolute inset-0 rounded-xl"
        :colors="['red', 'yellow', 'lime', 'cyan', 'blue', 'magenta', 'red']"
      />
    </ColorSliderTrack>
  </ColorSliderRoot>
</template>
```

The `colors` prop defines the gradient stops. For a hue slider, use the full spectrum. For other channels, you can use fewer stops — the gradient will interpolate between them.

## Step 4: Add the thumb

`ColorSliderThumb` is the draggable handle. It's positioned automatically by the component.

```vue
<script setup lang="ts">
import { shallowRef } from "vue";
import { Color } from "internationalized-color";
import {
  ColorSliderRoot,
  ColorSliderTrack,
  ColorSliderGradient,
  ColorSliderThumb, // [!code ++]
} from "@urcolor/vue";

const color = shallowRef(Color.parse("hsl(210, 80%, 50%)")!);
</script>

<template>
  <ColorSliderRoot
    v-model="color"
    color-space="hsl"
    channel="h"
  >
    <ColorSliderTrack
      class="relative h-5 overflow-hidden rounded-xl"
    >
      <ColorSliderGradient
        class="absolute inset-0 rounded-xl"
        :colors="['red', 'yellow', 'lime', 'cyan', 'blue', 'magenta', 'red']"
      />
      <!-- [!code ++:8] -->
      <ColorSliderThumb
        class="
          block size-5 rounded-full border-[2.5px] border-white bg-white
          shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
          focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
        "
        aria-label="Hue"
      />
    </ColorSliderTrack>
  </ColorSliderRoot>
</template>
```

::: tip
All components are completely unstyled — the classes above are just an example using Tailwind CSS. Use any styling approach you prefer.
:::

## Vertical orientation

Set `orientation="vertical"` to render a vertical slider:

```vue{5}
<template>
  <ColorSliderRoot
    v-model="color"
    color-space="hsl"
    orientation="vertical"
    channel="h"
  >
    <!-- ... -->
  </ColorSliderRoot>
</template>
```

## Inverting direction

Use `inverted` to reverse the slider direction:

```vue{5}
<template>
  <ColorSliderRoot
    v-model="color"
    color-space="hsl"
    :inverted="true"
    channel="h"
  >
    <!-- ... -->
  </ColorSliderRoot>
</template>
```

## Different channels

Switch the `channel` prop to control different color properties. For example, a lightness slider:

```vue{5,12}
<template>
  <ColorSliderRoot
    v-model="color"
    color-space="hsl"
    channel="l"
  >
    <ColorSliderTrack
      class="relative h-5 overflow-hidden rounded-xl"
    >
      <ColorSliderGradient
        class="absolute inset-0 rounded-xl"
        :colors="['black', 'hsl(210, 80%, 50%)', 'white']"
      />
      <ColorSliderThumb
        class="..."
        aria-label="Lightness"
      />
    </ColorSliderTrack>
  </ColorSliderRoot>
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
  <ColorSliderRoot
    v-model="color"
    color-space="hsl"
    @update:model-value="onColorChange"
    @value-commit="onColorCommit"
    channel="h"
  >
    <!-- ... -->
  </ColorSliderRoot>
</template>
```

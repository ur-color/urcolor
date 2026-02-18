# Build a Photoshop-like Color Picker

Let's combine a color ring and color triangle into a Photoshop-style HSV color picker.

<script setup>
import ColorPickerGuide from './demo/ColorPickerGuide.vue'
</script>

Here's what we'll end up with:

<ColorPickerGuide />

## Step 1: Set up shared state

Both components will share the same color ref. Start with a single reactive color value.

```vue
<script setup lang="ts">
import { shallowRef } from "vue";  // [!code ++]
import { Color } from "internationalized-color";  // [!code ++]

const color = shallowRef(Color.parse("hsl(210, 80%, 50%)")!);  // [!code ++]
</script>
```

## Step 2: Add the outer hue ring

The `ColorRing` handles hue selection. We use a relative container to position the ring and triangle together.

```vue
<script setup lang="ts">
import { shallowRef } from "vue";
import { Color } from "internationalized-color";
import { // [!code ++]
  ColorRingRoot, // [!code ++]
  ColorRingTrack, // [!code ++]
  ColorRingGradient, // [!code ++]
  ColorRingThumb, // [!code ++]
} from "@urcolor/vue"; // [!code ++]

const color = shallowRef(Color.parse("hsl(210, 80%, 50%)")!);
</script>

<template>
  <!-- [!code ++:24] -->
  <div class="relative size-64">
    <ColorRingRoot
      v-model="color"
      color-space="hsv"
      channel="h"
      :inner-radius="0.84"
      class="absolute inset-0"
      style="container-type: inline-size"
    >
      <ColorRingTrack class="relative block size-full">
        <ColorRingGradient
          class="absolute inset-0 block"
          :channel-overrides="{ s: 1, v: 1, alpha: 1 }"
        />
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
  </div>
</template>
```

The outer `div` acts as the layout container. The ring is absolutely positioned to fill it.

## Step 3: Add the inner color triangle

Place a `ColorTriangle` inside the ring to control saturation and value. Use `absolute` positioning with `inset` to center it.

```vue
<script setup lang="ts">
import { shallowRef } from "vue";
import { Color } from "internationalized-color";
import {
  ColorRingRoot,
  ColorRingTrack,
  ColorRingGradient,
  ColorRingThumb,
  ColorTriangleRoot, // [!code ++]
  ColorTriangleGradient, // [!code ++]
  ColorTriangleThumb, // [!code ++]
} from "@urcolor/vue";

const color = shallowRef(Color.parse("hsl(210, 80%, 50%)")!);
</script>

<template>
  <div class="relative size-64">
    <ColorRingRoot
      v-model="color"
      color-space="hsv"
      channel="h"
      :inner-radius="0.84"
      class="absolute inset-0"
      style="container-type: inline-size"
    >
      <ColorRingTrack class="relative block size-full">
        <ColorRingGradient
          class="absolute inset-0 block"
          :channel-overrides="{ s: 1, v: 1, alpha: 1 }"
        />
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

    <!-- [!code ++:15] -->
    <ColorTriangleRoot
      v-model="color"
      color-space="hsv"
      channel-x="s"
      channel-y="v"
      class="absolute inset-[8%]"
    >
      <ColorTriangleGradient class="absolute inset-0 block" />
      <ColorTriangleThumb
        class="
          size-4 rounded-full border-2 border-white
          shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
          focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
        "
        aria-label="Color"
      />
    </ColorTriangleRoot>
  </div>
</template>
```

The key is `inset-[8%]` — this positions the triangle so its vertices touch the ring's inner edge. Both components share the same `v-model="color"`, so dragging the hue ring updates the triangle's gradient, and dragging the triangle updates the color while keeping the hue ring in sync.

::: tip
All components are completely unstyled — the classes above are just an example using Tailwind CSS. Adjust the `inset` value based on your ring's `inner-radius` to fit the triangle snugly inside.
:::

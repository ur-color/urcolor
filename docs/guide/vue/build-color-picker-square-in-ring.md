# Build Color Picker (Square in Ring)

Let's combine a color ring and color area into an HSV color picker with a square gradient inside a hue ring.

<script setup>
import ColorPickerSquareInRingGuide from './demo/ColorPickerSquareInRingGuide.vue'
</script>

Here's what we'll end up with:

<ColorPickerSquareInRingGuide />

## Step 1: Set up shared state

Both components will share the same color ref. Start with a single reactive color value.

```vue
<script setup lang="ts">
import { useColor } from "@urcolor/vue";  // [!code ++]

const { color } = useColor("hsl(210, 80%, 50%)");  // [!code ++]
</script>
```

## Step 2: Add the outer hue ring

The `ColorRing` handles hue selection. We use a relative container to position the ring and square together.

```vue
<script setup lang="ts">
import { // [!code ++]
  useColor, // [!code ++]
  ColorRingRoot, // [!code ++]
  ColorRingTrack, // [!code ++]
  ColorRingGradient, // [!code ++]
  ColorRingThumb, // [!code ++]
} from "@urcolor/vue"; // [!code ++]

const { color } = useColor("hsl(210, 80%, 50%)");
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

## Step 3: Add the inner color area

Place a `ColorArea` inside the ring to control saturation and value. Use `absolute` positioning with `inset-[20.3%]` to inscribe the square perfectly inside the ring's inner circle.

```vue
<script setup lang="ts">
import {
  useColor,
  ColorRingRoot,
  ColorRingTrack,
  ColorRingGradient,
  ColorRingThumb,
  ColorAreaRoot, // [!code ++]
  ColorAreaTrack, // [!code ++]
  ColorAreaGradient, // [!code ++]
  ColorAreaThumb, // [!code ++]
  ColorAreaThumbX, // [!code ++]
  ColorAreaThumbY, // [!code ++]
} from "@urcolor/vue";

const { color } = useColor("hsl(210, 80%, 50%)");
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

    <!-- [!code ++:22] -->
    <ColorAreaRoot
      v-model="color"
      color-space="hsv"
      channel-x="s"
      channel-y="v"
      :inverted-y="true"
      class="absolute inset-[20.3%]"
    >
      <ColorAreaTrack class="relative size-full cursor-crosshair touch-none overflow-clip rounded-sm">
        <ColorAreaGradient class="absolute inset-0" />
        <ColorAreaThumb
          class="
            absolute size-5 transform-(--reka-slider-area-thumb-transform)
            rounded-full border-2 border-white
            shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
            focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
          "
        >
          <ColorAreaThumbX />
          <ColorAreaThumbY />
        </ColorAreaThumb>
      </ColorAreaTrack>
    </ColorAreaRoot>
  </div>
</template>
```

The key is `inset-[20.3%]` — this inscribes the square perfectly inside the ring's inner circle (`50% × (1 − 0.84/√2) ≈ 20.3%`). The `:inverted-y="true"` prop flips the Y axis so value increases upward. Both components share the same `v-model="color"`, so dragging the hue ring updates the area's gradient, and dragging the area updates the color while keeping the hue ring in sync.

::: tip
All components are completely unstyled — the classes above are just an example using Tailwind CSS. To compute the inset for any `inner-radius`, use `50% × (1 − innerRadius / √2)`.
:::

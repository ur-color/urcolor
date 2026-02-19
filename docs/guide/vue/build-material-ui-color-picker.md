# Build Material UI Color Picker

Let's build a Material-style color picker with a color area, hue slider, alpha slider, and channel input fields.

<script setup>
import MaterialColorPickerGuide from './demo/MaterialColorPickerGuide.vue'
</script>

Here's what we'll end up with:

<MaterialColorPickerGuide />

## Step 1: Set up shared state

All components will share the same color ref.

```vue
<script setup lang="ts">
import { useColor } from "@urcolor/vue";  // [!code ++]

const { color } = useColor("hsl(210, 80%, 50%)");  // [!code ++]
</script>
```

## Step 2: Add the color area

The `ColorArea` provides a 2D gradient for picking saturation and value in HSV space.

```vue
<script setup lang="ts">
import { // [!code ++]
  useColor, // [!code ++]
  ColorAreaRoot, // [!code ++]
  ColorAreaTrack, // [!code ++]
  ColorAreaGradient, // [!code ++]
  ColorAreaThumb, // [!code ++]
  ColorAreaThumbX, // [!code ++]
  ColorAreaThumbY, // [!code ++]
} from "@urcolor/vue"; // [!code ++]

const { color } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <!-- [!code ++:22] -->
  <div class="flex w-full max-w-xs flex-col gap-3 rounded-xl p-3">
    <ColorAreaRoot
      v-model="color"
      color-space="hsv"
      channel-x="s"
      channel-y="v"
      :inverted-y="true"
    >
      <ColorAreaTrack class="relative h-[180px] w-full cursor-crosshair touch-none overflow-clip rounded-lg">
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

## Step 3: Add the hue slider

Add a `ColorSlider` below the area to control the hue channel.

```vue
<script setup lang="ts">
import {
  useColor,
  ColorAreaRoot,
  ColorAreaTrack,
  ColorAreaGradient,
  ColorAreaThumb,
  ColorAreaThumbX,
  ColorAreaThumbY,
  ColorSliderRoot, // [!code ++]
  ColorSliderTrack, // [!code ++]
  ColorSliderGradient, // [!code ++]
  ColorSliderThumb, // [!code ++]
} from "@urcolor/vue";

const { color } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <div class="flex w-full max-w-xs flex-col gap-3 rounded-xl p-3">
    <ColorAreaRoot
      v-model="color"
      color-space="hsv"
      channel-x="s"
      channel-y="v"
      :inverted-y="true"
    >
      <ColorAreaTrack class="relative h-[180px] w-full cursor-crosshair touch-none overflow-clip rounded-lg">
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

    <!-- [!code ++:16] -->
    <ColorSliderRoot
      v-model="color"
      color-space="hsv"
      channel="h"
    >
      <ColorSliderTrack class="relative h-4 overflow-hidden rounded-full">
        <ColorSliderGradient
          class="absolute inset-0 rounded-full"
          :colors="['red', 'yellow', 'lime', 'cyan', 'blue', 'magenta', 'red']"
        />
        <ColorSliderThumb
          class="
            block size-4 rounded-full border-2 border-white
            shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
            focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
          "
          aria-label="Hue"
        />
      </ColorSliderTrack>
    </ColorSliderRoot>
  </div>
</template>
```

## Step 4: Add the alpha slider

Add another `ColorSlider` for the alpha (opacity) channel, with a checkerboard background.

```vue
<script setup lang="ts">
import {
  useColor,
  ColorAreaRoot,
  ColorAreaTrack,
  ColorAreaGradient,
  ColorAreaThumb,
  ColorAreaThumbX,
  ColorAreaThumbY,
  ColorSliderRoot,
  ColorSliderTrack,
  ColorSliderGradient,
  ColorSliderThumb,
  ColorSliderCheckerboard, // [!code ++]
} from "@urcolor/vue";

const { color } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <div class="flex w-full max-w-xs flex-col gap-3 rounded-xl p-3">
    <!-- ...color area and hue slider... -->

    <!-- [!code ++:17] -->
    <ColorSliderRoot
      v-model="color"
      color-space="hsv"
      channel="alpha"
    >
      <ColorSliderTrack class="relative h-4 overflow-hidden rounded-full">
        <ColorSliderCheckerboard class="absolute inset-0 rounded-full" />
        <ColorSliderGradient class="absolute inset-0 rounded-full" />
        <ColorSliderThumb
          class="
            block size-4 rounded-full border-2 border-white
            shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
            focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
          "
          aria-label="Alpha"
        />
      </ColorSliderTrack>
    </ColorSliderRoot>
  </div>
</template>
```

The `ColorSliderCheckerboard` renders behind the gradient to indicate transparency.

## Step 5: Add color field inputs

Add `ColorField` inputs for each HSL channel so users can type precise values.

```vue
<script setup lang="ts">
import { computed } from "vue"; // [!code ++]
import { colorSpaces } from "@urcolor/core"; // [!code ++]
import { Label } from "reka-ui"; // [!code ++]
import {
  useColor,
  ColorAreaRoot,
  ColorAreaTrack,
  ColorAreaGradient,
  ColorAreaThumb,
  ColorAreaThumbX,
  ColorAreaThumbY,
  ColorSliderRoot,
  ColorSliderTrack,
  ColorSliderGradient,
  ColorSliderThumb,
  ColorSliderCheckerboard,
  ColorFieldRoot, // [!code ++]
  ColorFieldInput, // [!code ++]
  ColorFieldIncrement, // [!code ++]
  ColorFieldDecrement, // [!code ++]
} from "@urcolor/vue";

const { color } = useColor("hsl(210, 80%, 50%)");
const channels = computed(() => colorSpaces["hsl"]?.channels ?? []); // [!code ++]
</script>

<template>
  <div class="flex w-full max-w-xs flex-col gap-3 rounded-xl p-3">
    <!-- ...color area, hue slider, alpha slider... -->

    <!-- [!code ++:30] -->
    <div class="flex flex-1 flex-wrap gap-2">
      <div
        v-for="ch in channels"
        :key="ch.key"
        class="flex min-w-[60px] flex-1 flex-col gap-1"
      >
        <Label
          :for="`material-field-${ch.key}`"
          class="text-xs font-semibold"
        >{{ ch.label }}</Label>
        <ColorFieldRoot
          v-model="color"
          color-space="hsl"
          :channel="ch.key"
          class="flex items-center overflow-hidden rounded-md border"
        >
          <ColorFieldDecrement
            class="flex size-7 shrink-0 cursor-pointer items-center justify-center"
          >
            &minus;
          </ColorFieldDecrement>
          <ColorFieldInput
            :id="`material-field-${ch.key}`"
            class="w-0 min-w-0 flex-1 border-none bg-transparent px-0.5 py-1 text-center font-mono text-sm outline-none"
          />
          <ColorFieldIncrement
            class="flex size-7 shrink-0 cursor-pointer items-center justify-center"
          >
            +
          </ColorFieldIncrement>
        </ColorFieldRoot>
      </div>
    </div>
  </div>
</template>
```

The `colorSpaces["hsl"].channels` array gives us channel metadata (key and label) so we can dynamically render a field for each HSL channel.

::: tip
All components are completely unstyled — the classes above are just an example using Tailwind CSS. You can style the card, inputs, and sliders however you like.
:::

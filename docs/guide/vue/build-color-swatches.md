# Build Color Swatches

Let's build color swatches for displaying and selecting colors step by step.

<script setup>
import ColorSwatchGuide from './demo/ColorSwatchGuide.vue'
</script>

Here's what we'll end up with:

<ColorSwatchGuide />

## Step 1: Set up state

Start by importing the color model and defining your colors.

```vue
<script setup lang="ts">
import { useColor } from "@urcolor/vue";  // [!code ++]

const { color } = useColor("hsl(210, 80%, 50%)");  // [!code ++]
</script>
```

## Step 2: Render a swatch

`ColorSwatchRoot` renders a single color as a filled element. Pass the color via `model-value`.

```vue
<script setup lang="ts">
import { useColor, ColorSwatchRoot } from "@urcolor/vue"; // [!code ++]

const { color } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <!-- [!code ++:5] -->
  <ColorSwatchRoot
    :model-value="color"
    class="size-10 rounded-lg"
  />
</template>
```

The swatch renders the color as a background. It's completely unstyled — add your own sizing, border-radius, and other styles.

::: tip
All components are completely unstyled — the classes above are just an example using Tailwind CSS. Use any styling approach you prefer.
:::

## Alpha transparency

Set the `alpha` prop to show a checkerboard pattern behind semi-transparent colors:

```vue{4}
<template>
  <ColorSwatchRoot
    :model-value="color"
    alpha
    class="size-10 rounded-lg"
  />
</template>
```

Without `alpha`, the color is rendered fully opaque regardless of its alpha channel.

## Checkerboard size

Customize the checkerboard pattern size with `checker-size` (in pixels):

```vue{5}
<template>
  <ColorSwatchRoot
    :model-value="color"
    alpha
    :checker-size="8"
    class="size-10 rounded-lg"
  />
</template>
```

## Multiple swatches

Render a palette by looping over an array of colors:

```vue{6-7,13,15,19-35}
<script setup lang="ts">
import { shallowRef } from "vue";
import { Color } from "internationalized-color";
import { ColorSwatchRoot } from "@urcolor/vue";
import { Check } from "lucide-vue-next";

const colors = [
  Color.parse("hsl(210, 80%, 50%)")!,
  Color.parse("hsl(350, 90%, 60%)")!,
  Color.parse("hsl(120, 60%, 45%)")!,
  Color.parse("hsla(45, 100%, 55%, 0.5)")!,
];

const selected = shallowRef(colors[0]);
</script>

<template>
  <div class="flex items-center gap-3">
    <ColorSwatchRoot
      v-for="(color, i) in colors"
      :key="i"
      :model-value="color"
      alpha
      class="
        size-10 cursor-pointer rounded-lg
        flex items-center justify-center
      "
      @click="selected = color"
    >
      <Check
        class="size-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition-opacity duration-150"
        :class="selected === color ? 'opacity-100' : 'opacity-0'"
      />
    </ColorSwatchRoot>
  </div>
</template>
```

## String colors

You can also pass a plain CSS color string instead of a `Color` object:

```vue
<template>
  <ColorSwatchRoot
    model-value="oklch(0.6 0.15 210)"
    class="size-10 rounded-lg"
  />
</template>
```

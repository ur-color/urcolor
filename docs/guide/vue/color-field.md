# Build Color Fields

Let's build numeric input fields for editing individual color channels step by step.

<script setup>
import ColorFieldGuide from './demo/ColorFieldGuide.vue'
</script>

Here's what we'll end up with:

<ColorFieldGuide />

## Step 1: Set up state

Start by importing the color model and creating a reactive color value.

```vue
<script setup lang="ts">
import { shallowRef } from "vue";  // [!code ++]
import { Color } from "internationalized-color";  // [!code ++]

const color = shallowRef(Color.parse("hsl(210, 80%, 50%)")!);  // [!code ++]
</script>
```

## Step 2: Add the root

`ColorFieldRoot` manages the state for a single channel input. Tell it which color space and channel to control.

```vue
<script setup lang="ts">
import { shallowRef } from "vue";
import { Color } from "internationalized-color";
import { ColorFieldRoot } from "@urcolor/vue"; // [!code ++]

const color = shallowRef(Color.parse("hsl(210, 80%, 50%)")!);
</script>

<template>
  <!-- [!code ++:6] -->
  <ColorFieldRoot
    v-model="color"
    color-space="hsl"
    channel="h"
  >
    <!-- children go here -->
  </ColorFieldRoot>
</template>
```

- `color-space` — the color space to work in (`hsl`, `oklch`, `hsb`, etc.)
- `channel` — the channel this field controls (`h`, `s`, `l`, etc.)

## Step 3: Add the input

`ColorFieldInput` renders the numeric input. It automatically formats the value based on the channel (degrees, percentages, etc.).

```vue
<script setup lang="ts">
import { shallowRef } from "vue";
import { Color } from "internationalized-color";
import {
  ColorFieldRoot,
  ColorFieldInput, // [!code ++]
} from "@urcolor/vue";

const color = shallowRef(Color.parse("hsl(210, 80%, 50%)")!);
</script>

<template>
  <ColorFieldRoot
    v-model="color"
    color-space="hsl"
    channel="h"
    class="
      flex items-center overflow-hidden rounded-md border
      border-(--vp-c-divider) bg-(--vp-c-bg)
    "
  >
    <!-- [!code ++:5] -->
    <ColorFieldInput
      class="
        w-full border-none bg-transparent px-2 py-1
        text-center font-mono text-sm outline-none
      "
    />
  </ColorFieldRoot>
</template>
```

The input supports keyboard interactions — arrow keys increment and decrement the value, and typing a number updates the color directly.

## Step 4: Add increment and decrement buttons

`ColorFieldIncrement` and `ColorFieldDecrement` provide stepper buttons for fine-tuning the value.

```vue
<script setup lang="ts">
import { shallowRef } from "vue";
import { Color } from "internationalized-color";
import {
  ColorFieldRoot,
  ColorFieldInput,
  ColorFieldIncrement, // [!code ++]
  ColorFieldDecrement, // [!code ++]
} from "@urcolor/vue";

const color = shallowRef(Color.parse("hsl(210, 80%, 50%)")!);
</script>

<template>
  <ColorFieldRoot
    v-model="color"
    color-space="hsl"
    channel="h"
    class="
      flex items-center overflow-hidden rounded-md border
      border-(--vp-c-divider) bg-(--vp-c-bg)
    "
  >
    <!-- [!code ++:4] -->
    <ColorFieldDecrement class="flex size-8 items-center justify-center">
      &minus;
    </ColorFieldDecrement>
    <ColorFieldInput
      class="
        w-0 min-w-0 flex-1 border-none bg-transparent px-0.5 py-1
        text-center font-mono text-[13px] outline-none
      "
    />
    <!-- [!code ++:4] -->
    <ColorFieldIncrement class="flex size-8 items-center justify-center">
      +
    </ColorFieldIncrement>
  </ColorFieldRoot>
</template>
```

::: tip
All components are completely unstyled — the classes above are just an example using Tailwind CSS. Use any styling approach you prefer.
:::

## Multiple channels

To build a full channel editor, loop over the channels in a color space using the `colorSpaces` helper from `@urcolor/core`:

```vue{3,4,9,16-21}
<script setup lang="ts">
import { shallowRef, computed } from "vue";
import { Color } from "internationalized-color";
import { colorSpaces } from "@urcolor/core";
import {
  ColorFieldRoot,
  ColorFieldInput,
  ColorFieldIncrement,
  ColorFieldDecrement,
} from "@urcolor/vue";

const color = shallowRef(Color.parse("hsl(210, 80%, 50%)")!);
const channels = computed(() => colorSpaces["hsl"]?.channels ?? []);
</script>

<template>
  <div class="flex gap-2">
    <div v-for="ch in channels" :key="ch.key" class="flex flex-col gap-1">
      <label class="text-xs font-semibold">{{ ch.label }}</label>
      <ColorFieldRoot v-model="color" color-space="hsl" :channel="ch.key">
        <ColorFieldDecrement>&minus;</ColorFieldDecrement>
        <ColorFieldInput />
        <ColorFieldIncrement>+</ColorFieldIncrement>
      </ColorFieldRoot>
    </div>
  </div>
</template>
```

Each `ColorFieldRoot` shares the same `v-model` — updating one channel automatically keeps the others in sync.

## Hex format

Set `channel` to `"hex"` and `format` to `"hex"` for a hex color input:

```vue{5-6}
<template>
  <ColorFieldRoot
    v-model="color"
    color-space="hsl"
    channel="hex"
    format="hex"
  >
    <ColorFieldInput />
  </ColorFieldRoot>
</template>
```

## Listening to changes

Use `@update:model-value` for real-time updates and `@value-commit` for the final value (on blur or Enter):

```vue{3-8,15-16}
<script setup lang="ts">
// ...
const onColorChange = (color: Color) => {
  console.log("changing", color.toString("css"));
};
const onColorCommit = (color: Color) => {
  console.log("committed", color.toString("css"));
};
</script>

<template>
  <ColorFieldRoot
    v-model="color"
    color-space="hsl"
    channel="h"
    @update:model-value="onColorChange"
    @value-commit="onColorCommit"
  >
    <!-- ... -->
  </ColorFieldRoot>
</template>
```

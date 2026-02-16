# Build a Color Swatch Group

Let's build a keyboard-navigable color swatch group for selecting colors from a palette.

<script setup>
import ColorSwatchGroupGuide from './demo/ColorSwatchGroupGuide.vue'
</script>

Here's what we'll end up with:

<ColorSwatchGroupGuide />

## Step 1: Set up state

Define your color palette and a reactive selection state.

```vue
<script setup lang="ts">
import { ref } from "vue";  // [!code ++]

const colors = [  // [!code ++]
  "hsl(210, 80%, 50%)",  // [!code ++]
  "hsl(350, 90%, 60%)",  // [!code ++]
  "hsl(120, 60%, 45%)",  // [!code ++]
  "hsl(45, 100%, 55%)",  // [!code ++]
];  // [!code ++]

const selected = ref<string[]>([colors[0]!]);  // [!code ++]
</script>
```

The selection is always an array of strings — even for single selection mode.

## Step 2: Add the group root

`ColorSwatchGroupRoot` manages selection state and keyboard navigation (arrow keys, roving focus).

```vue
<script setup lang="ts">
import { ref } from "vue";
import { ColorSwatchGroupRoot } from "@urcolor/vue"; // [!code ++]

const colors = [
  "hsl(210, 80%, 50%)",
  "hsl(350, 90%, 60%)",
  "hsl(120, 60%, 45%)",
  "hsl(45, 100%, 55%)",
];

const selected = ref<string[]>([colors[0]!]);
</script>

<template>
  <!-- [!code ++:5] -->
  <ColorSwatchGroupRoot
    v-model="selected"
    type="single"
    class="flex items-center gap-2"
  >
    <!-- items go here -->
  </ColorSwatchGroupRoot>
</template>
```

- `type="single"` — only one color can be selected at a time
- `type="multiple"` — multiple colors can be selected

## Step 3: Add swatch items

`ColorSwatchGroupItem` renders each selectable color. The `value` prop is both the selection value and the displayed color.

```vue
<script setup lang="ts">
import { ref } from "vue";
import {
  ColorSwatchGroupRoot,
  ColorSwatchGroupItem, // [!code ++]
} from "@urcolor/vue";

const colors = [
  "hsl(210, 80%, 50%)",
  "hsl(350, 90%, 60%)",
  "hsl(120, 60%, 45%)",
  "hsl(45, 100%, 55%)",
];

const selected = ref<string[]>([colors[0]!]);
</script>

<template>
  <ColorSwatchGroupRoot
    v-model="selected"
    type="single"
    class="flex items-center gap-2"
  >
    <!-- [!code ++:9] -->
    <ColorSwatchGroupItem
      v-for="color in colors"
      :key="color"
      :value="color"
      class="
        size-10 cursor-pointer rounded-lg outline-2 outline-offset-2
        outline-transparent
        data-[state=on]:outline-(--vp-c-brand-2)!
      "
    />
  </ColorSwatchGroupRoot>
</template>
```

Each item automatically renders as a `<button>` with the appropriate ARIA role (`radio` for single, `checkbox` for multiple). The `data-state` attribute is `"on"` when selected and `"off"` otherwise — use it for styling.

::: tip
All components are completely unstyled — the classes above are just an example using Tailwind CSS. Use any styling approach you prefer.
:::

## Multiple selection

Change `type` to `"multiple"` to allow selecting more than one color:

```vue{4}
<template>
  <ColorSwatchGroupRoot
    v-model="selected"
    type="multiple"
    class="flex items-center gap-2"
  >
    <ColorSwatchGroupItem
      v-for="color in colors"
      :key="color"
      :value="color"
      class="..."
    />
  </ColorSwatchGroupRoot>
</template>
```

## Keyboard navigation

The group supports full keyboard navigation out of the box:

- **Arrow keys** — move focus between swatches
- **Space / Enter** — toggle selection
- **Home / End** — jump to first or last swatch

You can configure navigation behavior with these props on the root:

```vue{5-6}
<template>
  <ColorSwatchGroupRoot
    v-model="selected"
    type="single"
    :loop="true"
    :roving-focus="true"
    orientation="horizontal"
  >
    <!-- ... -->
  </ColorSwatchGroupRoot>
</template>
```

- `loop` — whether arrow keys wrap around (default: `true`)
- `roving-focus` — whether to use roving tabindex (default: `true`)
- `orientation` — `"horizontal"` or `"vertical"` for arrow key direction

## Disabled items

Disable individual swatches or the entire group:

```vue{3,9}
<template>
  <ColorSwatchGroupRoot
    :disabled="true"
    v-model="selected"
    type="single"
  >
    <ColorSwatchGroupItem
      :value="color"
      :disabled="true"
    />
  </ColorSwatchGroupRoot>
</template>
```

## Listening to changes

Use `@update:model-value` to react to selection changes:

```vue{3-5,11}
<script setup lang="ts">
// ...
const onSelectionChange = (value: string[]) => {
  console.log("selected:", value);
};
</script>

<template>
  <ColorSwatchGroupRoot
    v-model="selected"
    @update:model-value="onSelectionChange"
    type="single"
  >
    <!-- ... -->
  </ColorSwatchGroupRoot>
</template>
```

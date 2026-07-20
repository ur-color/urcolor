# Build a Color Swatch Picker

Let's build a keyboard-navigable color swatch picker for selecting colors from a palette.

<script setup>
import ColorSwatchPickerGuide from './demo/ColorSwatchPickerGuide.vue'
</script>

Here's what we'll end up with:

<ColorSwatchPickerGuide />


<details>
<summary>Click to view the full code</summary>

::: code-group

<<< @/guide/vue/demo/ColorSwatchPickerGuide.vue

:::

</details>

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

const selected = ref<string>(colors[0]!);  // [!code ++]
</script>
```

The selection is a single string. Only when you opt into `multiple` does it become an array of strings.

## Step 2: Add the picker root

`ColorSwatchPickerRoot` is a listbox: it owns the selection state and moves the highlight with the arrow keys.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { ColorSwatchPickerRoot } from "@urcolor/vue"; // [!code ++]

const colors = [
  "hsl(210, 80%, 50%)",
  "hsl(350, 90%, 60%)",
  "hsl(120, 60%, 45%)",
  "hsl(45, 100%, 55%)",
];

const selected = ref<string>(colors[0]!);
</script>

<template>
  <!-- [!code ++:7] -->
  <ColorSwatchPickerRoot
    v-model="selected"
    as="div"
    class="flex items-center gap-2"
  >
    <!-- items go here -->
  </ColorSwatchPickerRoot>
</template>
```

The root renders `role="listbox"`. By default the picker is single-select and horizontal.

## Step 3: Add swatch items

`ColorSwatchPickerItem` renders each selectable option. Its `value` is both the selection key and the color it stands for — `ColorSwatchPickerItemSwatch` reads that color from the item and paints it.

```vue
<script setup lang="ts">
import { ref } from "vue";
import {
  ColorSwatchPickerRoot,
  ColorSwatchPickerItem, // [!code ++]
  ColorSwatchPickerItemSwatch, // [!code ++]
} from "@urcolor/vue";

const colors = [
  "hsl(210, 80%, 50%)",
  "hsl(350, 90%, 60%)",
  "hsl(120, 60%, 45%)",
  "hsl(45, 100%, 55%)",
];

const selected = ref<string>(colors[0]!);
</script>

<template>
  <ColorSwatchPickerRoot
    v-model="selected"
    as="div"
    class="flex items-center gap-2"
  >
    <!-- [!code ++:15] -->
    <ColorSwatchPickerItem
      v-for="color in colors"
      :key="color"
      :value="color"
      as="div"
      class="
        relative size-10 cursor-pointer rounded-lg outline-none
        data-[highlighted]:outline-2 data-[highlighted]:outline-offset-2
      "
    >
      <ColorSwatchPickerItemSwatch
        as="div"
        class="size-full rounded-lg"
      />
    </ColorSwatchPickerItem>
  </ColorSwatchPickerRoot>
</template>
```

Each item renders `role="option"` with `data-state="checked"` or `"unchecked"`, plus `data-highlighted` on the item the keyboard is currently on — style against those attributes.

## Step 4: Add the selected indicator

`ColorSwatchPickerItemIndicator` renders its children only while its item is selected, so a checkmark appears on exactly the chosen swatches without any state juggling in your template.

```vue
<script setup lang="ts">
import { ref } from "vue";
import {
  ColorSwatchPickerRoot,
  ColorSwatchPickerItem,
  ColorSwatchPickerItemSwatch,
  ColorSwatchPickerItemIndicator, // [!code ++]
} from "@urcolor/vue";
import { Check } from "lucide-vue-next"; // [!code ++]

// ...
</script>

<template>
  <ColorSwatchPickerRoot
    v-model="selected"
    as="div"
    class="flex items-center gap-2"
  >
    <ColorSwatchPickerItem
      v-for="color in colors"
      :key="color"
      :value="color"
      as="div"
      class="
        relative size-10 cursor-pointer rounded-lg outline-none
        data-[highlighted]:outline-2 data-[highlighted]:outline-offset-2
      "
    >
      <ColorSwatchPickerItemSwatch
        as="div"
        class="size-full rounded-lg"
      />
      <!-- [!code ++:8] -->
      <ColorSwatchPickerItemIndicator
        as="span"
        class="absolute inset-0 grid place-items-center"
      >
        <Check
          class="size-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
        />
      </ColorSwatchPickerItemIndicator>
    </ColorSwatchPickerItem>
  </ColorSwatchPickerRoot>
</template>
```

::: tip
All components are completely unstyled — the classes above are just an example using Tailwind CSS. Use any styling approach you prefer.
:::

## Multiple selection

Add `multiple` to allow selecting more than one color. The model value becomes an array, so type your ref accordingly:

```vue{2,8}
<script setup lang="ts">
const selected = ref<string[]>([]);
</script>

<template>
  <ColorSwatchPickerRoot
    v-model="selected"
    multiple
    as="div"
  >
    <!-- ... -->
  </ColorSwatchPickerRoot>
</template>
```

`selection-behavior` decides what a click on an already-selected swatch does. The default, `"toggle"`, deselects it; `"replace"` keeps it selected and replaces the rest of the selection instead:

```vue{5}
<template>
  <ColorSwatchPickerRoot
    v-model="selected"
    multiple
    selection-behavior="replace"
  >
    <!-- ... -->
  </ColorSwatchPickerRoot>
</template>
```

## Keyboard navigation

The picker is a single tab stop; once focus is inside, the arrow keys move the highlight:

- **Arrow keys** — move the highlight (left/right when horizontal, up/down when vertical)
- **Home / End** — jump to the first or last swatch
- **Space / Enter** — select the highlighted swatch
- **Ctrl/Cmd + A** — select every swatch, when `multiple` is set

Set `orientation="vertical"` to swap which arrow keys navigate:

```vue{4}
<template>
  <ColorSwatchPickerRoot
    v-model="selected"
    orientation="vertical"
    as="div"
    class="flex flex-col gap-2"
  >
    <!-- ... -->
  </ColorSwatchPickerRoot>
</template>
```

::: warning
Typeahead does not work here. The underlying listbox resolves an option's search
text from its `textValue` or `textContent`, and a swatch has neither — so typing a
color name or hex just highlights the first swatch.
:::

## Disabled items

Disable individual swatches or the entire picker:

```vue{4,8}
<template>
  <ColorSwatchPickerRoot
    v-model="selected"
    disabled
  >
    <ColorSwatchPickerItem
      :value="color"
      disabled
    />
  </ColorSwatchPickerRoot>
</template>
```

## Listening to changes

Use `@update:model-value` to react to selection changes:

```vue{3-5,11}
<script setup lang="ts">
// ...
const onSelectionChange = (value: string | string[] | undefined) => {
  console.log("selected:", value);
};
</script>

<template>
  <ColorSwatchPickerRoot
    v-model="selected"
    @update:model-value="onSelectionChange"
  >
    <!-- ... -->
  </ColorSwatchPickerRoot>
</template>
```

The root also emits `@highlight` when the keyboard highlight moves, `@entry-focus` when focus enters the picker, and `@leave` when the pointer leaves it.

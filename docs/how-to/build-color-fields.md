# How to Build Color Fields

Let's build numeric input fields for editing individual color channels step by step.

<script setup>
import ColorFieldGuide from './demo/vue/ColorFieldGuide.vue'
</script>

Here's what we'll end up with:

<ColorFieldGuide />

<details>
<summary>Click to view the full code</summary>

::: code-group

<<< @/how-to/demo/vue/ColorFieldGuide.vue [Vue]
<<< @/how-to/demo/react/ColorFieldGuide.tsx [React]
<<< @/how-to/demo/svelte/ColorFieldGuide.svelte [Svelte]
<<< @/how-to/demo/angular/color-field-guide.ts [Angular]

:::

</details>

## Step 1: Set up state

Start by importing the color model and creating color state.

::: code-group

```vue [Vue]
<script setup lang="ts">
import { useColor } from "@urcolor/vue";  // [!code ++]

const { color } = useColor("hsl(210, 80%, 50%)");  // [!code ++]
</script>
```

```tsx [React]
import { useColor } from "@urcolor/react"; // [!code ++]

function MyField() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)"); // [!code ++]
}
```

```svelte [Svelte]
<script lang="ts">
  import { useColor } from "@urcolor/svelte"; // [!code ++]

  const colorState = useColor("hsl(210, 80%, 50%)"); // [!code ++]
</script>
```

```ts [Angular]
import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core"; // [!code ++]

@Component({
  selector: "my-field",
  template: ``,
})
export class MyField {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!); // [!code ++]
}
```

:::

`useColor()` creates color state from any CSS color string. Vue returns a `{ color }` shallow ref; React returns `{ color, setColor }`; Svelte returns a rune-backed object whose `color`, `hex` and `alpha` are **getters** — keep the object (`colorState.color`) rather than destructuring it, or you lose reactivity. Angular has no hook: a plain `signal<Color>()` is the state, and `[(value)]` binds to it directly.

## Step 2: Add the root

The root manages the state for a single channel input. Tell it which color space and channel to control.

::: code-group

```vue [Vue]
<script setup lang="ts">
import { useColor, ColorFieldRoot } from "@urcolor/vue"; // [!code ++]

const { color } = useColor("hsl(210, 80%, 50%)");
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

```tsx [React]
import { useColor, ColorField } from "@urcolor/react"; // [!code ++]

function MyField() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    // [!code ++:6]
    <ColorField.Root
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      channel="h"
    >
      {/* children go here */}
    </ColorField.Root>
  );
}
```

```svelte [Svelte]
<script lang="ts">
  import { ColorField, useColor } from "@urcolor/svelte"; // [!code ++]

  const colorState = useColor("hsl(210, 80%, 50%)");
</script>

<!-- [!code ++:7] -->
<ColorField.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  channel="h"
>
  <!-- children go here -->
</ColorField.Root>
```

```ts [Angular]
import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_FIELD_DIRECTIVES } from "@urcolor/angular"; // [!code ++]

@Component({
  selector: "my-field",
  imports: [...COLOR_FIELD_DIRECTIVES], // [!code ++]
  template: `
    <!-- [!code ++:8] -->
    <div
      urcColorFieldRoot
      [(value)]="color"
      colorSpace="hsl"
      channel="h"
    >
      <!-- children go here -->
    </div>
  `,
})
export class MyField {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);
}
```

:::

Vue's `v-model` and Angular's `[(value)]` are true two-way bindings. React is one-way plus `onValueChange`. Svelte's `value` is `$bindable`, but `useColor` exposes getters, so bind it with Svelte 5's function form — `bind:value={() => colorState.color, colorState.setColor}` — which is exactly `v-model` for a getter/setter pair.

Angular ships every part of a family as a `COLOR_*_DIRECTIVES` array, so one entry in `imports` brings in the whole set.

- `color-space` / `colorSpace` — the color space to work in (`hsl`, `oklch`, `hsv`, etc.)
- `channel` — the channel this field controls (`h`, `s`, `l`, etc.)

## Step 3: Add the input

The input renders the numeric field. It automatically formats the value based on the channel (degrees, percentages, etc.).

::: code-group

```vue [Vue]
<script setup lang="ts">
import {
  useColor,
  ColorFieldRoot,
  ColorFieldInput, // [!code ++]
} from "@urcolor/vue";

const { color } = useColor("hsl(210, 80%, 50%)");
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

```tsx [React]
import { useColor, ColorField } from "@urcolor/react";

function MyField() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    <ColorField.Root
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      channel="h"
      className="
        flex items-center overflow-hidden rounded-md border
        border-[var(--vp-c-divider)] bg-[var(--vp-c-bg)]
      "
    >
      {/* [!code ++:5] */}
      <ColorField.Input
        className="
          w-full border-none bg-transparent px-2 py-1
          text-center font-mono text-sm outline-none
        "
      />
    </ColorField.Root>
  );
}
```

```svelte [Svelte]
<script lang="ts">
  import { ColorField, useColor } from "@urcolor/svelte";

  const colorState = useColor("hsl(210, 80%, 50%)");
</script>

<ColorField.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  channel="h"
  class="
    flex items-center overflow-hidden rounded-md border
    border-(--vp-c-divider) bg-(--vp-c-bg)
  "
>
  <!-- [!code ++:6] -->
  <ColorField.Input
    class="
      w-full border-none bg-transparent px-2 py-1
      text-center font-mono text-sm outline-none
    "
  />
</ColorField.Root>
```

```ts [Angular]
import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_FIELD_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "my-field",
  imports: [...COLOR_FIELD_DIRECTIVES],
  template: `
    <div
      urcColorFieldRoot
      [(value)]="color"
      colorSpace="hsl"
      channel="h"
      class="
        flex items-center overflow-hidden rounded-md border
        border-[var(--vp-c-divider)] bg-[var(--vp-c-bg)]
      "
    >
      <!-- [!code ++:7] -->
      <input
        urcColorFieldInput
        class="
          w-full border-none bg-transparent px-2 py-1
          text-center font-mono text-sm outline-none
        "
      />
    </div>
  `,
})
export class MyField {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);
}
```

:::

In Angular the input's selector is `input[urcColorFieldInput]`, so the directive goes on an `<input>` element you own; the other three render their own input for you.

The input supports keyboard interactions — arrow keys increment and decrement the value, and typing a number updates the color directly.

## Step 4: Add increment and decrement buttons

The increment and decrement parts provide stepper buttons for fine-tuning the value.

::: code-group

```vue [Vue]
<script setup lang="ts">
import {
  useColor,
  ColorFieldRoot,
  ColorFieldInput,
  ColorFieldIncrement, // [!code ++]
  ColorFieldDecrement, // [!code ++]
} from "@urcolor/vue";

const { color } = useColor("hsl(210, 80%, 50%)");
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

```tsx [React]
import { useColor, ColorField } from "@urcolor/react";

function MyField() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    <ColorField.Root
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      channel="h"
      className="
        flex items-center overflow-hidden rounded-md border
        border-[var(--vp-c-divider)] bg-[var(--vp-c-bg)]
      "
    >
      {/* [!code ++:2] */}
      <ColorField.Decrement className="flex size-8 items-center justify-center">
        &minus;
      </ColorField.Decrement>
      <ColorField.Input
        className="
          w-0 min-w-0 flex-1 border-none bg-transparent px-0.5 py-1
          text-center font-mono text-[13px] outline-none
        "
      />
      {/* [!code ++:2] */}
      <ColorField.Increment className="flex size-8 items-center justify-center">
        +
      </ColorField.Increment>
    </ColorField.Root>
  );
}
```

```svelte [Svelte]
<script lang="ts">
  import { ColorField, useColor } from "@urcolor/svelte";

  const colorState = useColor("hsl(210, 80%, 50%)");
</script>

<ColorField.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  channel="h"
  class="
    flex items-center overflow-hidden rounded-md border
    border-(--vp-c-divider) bg-(--vp-c-bg)
  "
>
  <!-- [!code ++:3] -->
  <ColorField.Decrement class="flex size-8 items-center justify-center">
    &minus;
  </ColorField.Decrement>
  <ColorField.Input
    class="
      w-0 min-w-0 flex-1 border-none bg-transparent px-0.5 py-1
      text-center font-mono text-[13px] outline-none
    "
  />
  <!-- [!code ++:3] -->
  <ColorField.Increment class="flex size-8 items-center justify-center">
    +
  </ColorField.Increment>
</ColorField.Root>
```

```ts [Angular]
import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_FIELD_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "my-field",
  imports: [...COLOR_FIELD_DIRECTIVES],
  template: `
    <div
      urcColorFieldRoot
      [(value)]="color"
      colorSpace="hsl"
      channel="h"
      class="
        flex items-center overflow-hidden rounded-md border
        border-[var(--vp-c-divider)] bg-[var(--vp-c-bg)]
      "
    >
      <!-- [!code ++:3] -->
      <button type="button" urcColorFieldDecrement class="flex size-8 items-center justify-center">
        &minus;
      </button>
      <input
        urcColorFieldInput
        class="
          w-0 min-w-0 flex-1 border-none bg-transparent px-0.5 py-1
          text-center font-mono text-[13px] outline-none
        "
      />
      <!-- [!code ++:3] -->
      <button type="button" urcColorFieldIncrement class="flex size-8 items-center justify-center">
        +
      </button>
    </div>
  `,
})
export class MyField {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);
}
```

:::

Angular scopes the steppers to buttons — the selectors are `button[urcColorFieldIncrement]` and `button[urcColorFieldDecrement]` — so they go on `<button>` elements you own, and the directive drives the press-and-hold repeat and the `disabled` state for you.

::: tip
All components are completely unstyled — the classes above are just an example using Tailwind CSS. Use any styling approach you prefer.
:::

## Multiple channels

To build a full channel editor, loop over the channels in a color space using the `colorSpaces` helper from `@urcolor/core`:

::: code-group

```vue{3,13,18-24} [Vue]
<script setup lang="ts">
import { computed } from "vue";
import { colorSpaces } from "@urcolor/core";
import {
  useColor,
  ColorFieldRoot,
  ColorFieldInput,
  ColorFieldIncrement,
  ColorFieldDecrement,
} from "@urcolor/vue";

const { color } = useColor("hsl(210, 80%, 50%)");
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

```tsx{1,6,10-19} [React]
import { colorSpaces } from "@urcolor/core";
import { useColor, ColorField } from "@urcolor/react";

function MyFields() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");
  const channels = colorSpaces["hsl"]?.channels ?? [];

  return (
    <div className="flex gap-2">
      {channels.map((ch) => (
        <div key={ch.key} className="flex flex-col gap-1">
          <label className="text-xs font-semibold">{ch.label}</label>
          <ColorField.Root value={color} onValueChange={setColor} colorSpace="hsl" channel={ch.key}>
            <ColorField.Decrement>&minus;</ColorField.Decrement>
            <ColorField.Input />
            <ColorField.Increment>+</ColorField.Increment>
          </ColorField.Root>
        </div>
      ))}
    </div>
  );
}
```

```svelte{2,6,10-23} [Svelte]
<script lang="ts">
  import { colorSpaces } from "@urcolor/core";
  import { ColorField, useColor } from "@urcolor/svelte";

  const colorState = useColor("hsl(210, 80%, 50%)");
  const channels = colorSpaces["hsl"]?.channels ?? [];
</script>

<div class="flex gap-2">
  {#each channels as ch (ch.key)}
    <div class="flex flex-col gap-1">
      <label class="text-xs font-semibold">{ch.label}</label>
      <ColorField.Root
        bind:value={() => colorState.color, colorState.setColor}
        colorSpace="hsl"
        channel={ch.key}
      >
        <ColorField.Decrement>&minus;</ColorField.Decrement>
        <ColorField.Input />
        <ColorField.Increment>+</ColorField.Increment>
      </ColorField.Root>
    </div>
  {/each}
</div>
```

```ts{2,10-19,25} [Angular]
import { Component, signal } from "@angular/core";
import { Color, colorSpaces } from "@urcolor/core";
import { COLOR_FIELD_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "my-fields",
  imports: [...COLOR_FIELD_DIRECTIVES],
  template: `
    <div class="flex gap-2">
      @for (ch of channels; track ch.key) {
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold">{{ ch.label }}</label>
          <div urcColorFieldRoot [(value)]="color" colorSpace="hsl" [channel]="ch.key">
            <button type="button" urcColorFieldDecrement>&minus;</button>
            <input urcColorFieldInput />
            <button type="button" urcColorFieldIncrement>+</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class MyFields {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);
  protected readonly channels = colorSpaces["hsl"]?.channels ?? [];
}
```

:::

Svelte loops with `{#each}` and Angular with `@for`; the `channel` value is dynamic in every framework, so it takes a binding — `:channel` in Vue, `channel={ch.key}` in React and Svelte, `[channel]` in Angular.

Every field shares the same color state — updating one channel automatically keeps the others in sync.

## Hex format

Set `channel` to `"hex"` and `format` to `"hex"` for a hex color input:

::: code-group

```vue{5-6} [Vue]
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

```tsx{5-6} [React]
<ColorField.Root
  value={color}
  onValueChange={setColor}
  colorSpace="hsl"
  channel="hex"
  format="hex"
>
  <ColorField.Input />
</ColorField.Root>
```

```svelte{4-5} [Svelte]
<ColorField.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  channel="hex"
  format="hex"
>
  <ColorField.Input />
</ColorField.Root>
```

```html{5-6} [Angular]
<div
  urcColorFieldRoot
  [(value)]="color"
  colorSpace="hsl"
  channel="hex"
  format="hex"
>
  <input urcColorFieldInput />
</div>
```

:::

## Listening to changes

Vue fires `@update:model-value` on every keystroke that parses and `@change-end` for
the settled value — blur, Enter, arrow keys, the wheel, or the stepper buttons.
React and Svelte call `onValueChange` and `onValueCommit` respectively; Angular emits
`(valueChange)` and `(valueCommit)`. Angular's `(valueChange)` is the output half of
`[(value)]`, so when you listen to it explicitly you bind the input one-way as
`[value]="color()"` and write the signal yourself.

::: code-group

```vue{3-8,15-16} [Vue]
<script setup lang="ts">
// ...
const onColorChange = (color: Color) => {
  console.log("changing", color.toString());
};
const onColorChangeEnd = (color: Color) => {
  console.log("committed", color.toString());
};
</script>

<template>
  <ColorFieldRoot
    v-model="color"
    color-space="hsl"
    channel="h"
    @update:model-value="onColorChange"
    @change-end="onColorChangeEnd"
  >
    <!-- ... -->
  </ColorFieldRoot>
</template>
```

```tsx{3-8,15-16} [React]
import { Color } from "@urcolor/core";

const onColorChange = (color: Color) => {
  console.log("changing", color.toString());
};
const onColorCommit = (color: Color) => {
  console.log("committed", color.toString());
};

<ColorField.Root
  value={color}
  onValueChange={onColorChange}
  onValueCommit={onColorCommit}
  colorSpace="hsl"
  channel="h"
>
  {/* ... */}
</ColorField.Root>
```

```svelte{4-9,16-17} [Svelte]
<script lang="ts">
  import type { Color } from "@urcolor/core";
  // ...
  const onColorChange = (color: Color) => {
    console.log("changing", color.toString());
  };
  const onColorCommit = (color: Color) => {
    console.log("committed", color.toString());
  };
</script>

<ColorField.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  channel="h"
  onValueChange={onColorChange}
  onValueCommit={onColorCommit}
>
  <!-- ... -->
</ColorField.Root>
```

```ts{12-13,24-31} [Angular]
import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_FIELD_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "my-field",
  imports: [...COLOR_FIELD_DIRECTIVES],
  template: `
    <div
      urcColorFieldRoot
      [value]="color()"
      (valueChange)="onColorChange($event)"
      (valueCommit)="onColorCommit($event)"
      colorSpace="hsl"
      channel="h"
    >
      <!-- ... -->
    </div>
  `,
})
export class MyField {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);

  protected onColorChange(color: Color): void {
    this.color.set(color);
    console.log("changing", color.toString());
  }

  protected onColorCommit(color: Color): void {
    console.log("committed", color.toString());
  }
}
```

:::

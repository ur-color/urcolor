# How to Build a Color Area Picker

Let's build a 2D color area picker step by step.

<script setup>
import ColorAreaGuide from './demo/vue/ColorAreaGuide.vue'
</script>

Here's what we'll end up with:

<ColorAreaGuide />

<details>
<summary>Click to view the full code</summary>

::: code-group

<<< @/how-to/demo/vue/ColorAreaGuide.vue [Vue]
<<< @/how-to/demo/react/ColorAreaGuide.tsx [React]
<<< @/how-to/demo/svelte/ColorAreaGuide.svelte [Svelte]
<<< @/how-to/demo/angular/color-area-guide.ts [Angular]

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

function MyArea() {
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
  selector: "my-area",
  template: ``,
})
export class MyArea {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!); // [!code ++]
}
```

:::

`useColor()` creates color state from any CSS color string. Vue returns a `{ color }` shallow ref; React returns `{ color, setColor }`; Svelte returns a rune-backed object whose `color`, `hex` and `alpha` are **getters** — keep the object (`colorState.color`) rather than destructuring it, or you lose reactivity. Angular has no hook: a plain `signal<Color>()` is the state, and `[(value)]` binds to it directly.

## Step 2: Add the root

The root manages all the state and interactions. Tell it which color space and channels to use for each axis.

::: code-group

```vue [Vue]
<script setup lang="ts">
import { useColor, ColorAreaRoot } from "@urcolor/vue"; // [!code ++]

const { color } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <!-- [!code ++:9] -->
  <ColorAreaRoot
    v-model="color"
    color-space="hsl"
    x-channel="h"
    y-channel="s"
    as="div"
  >
    <!-- children go here -->
  </ColorAreaRoot>
</template>
```

```tsx [React]
import { useColor, ColorArea } from "@urcolor/react"; // [!code ++]

function MyArea() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    // [!code ++:8]
    <ColorArea.Root
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      xChannel="h"
      yChannel="s"
    >
      {/* children go here */}
    </ColorArea.Root>
  );
}
```

```svelte [Svelte]
<script lang="ts">
  import { ColorArea, useColor } from "@urcolor/svelte"; // [!code ++]

  const colorState = useColor("hsl(210, 80%, 50%)");
</script>

<!-- [!code ++:8] -->
<ColorArea.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  xChannel="h"
  yChannel="s"
>
  <!-- children go here -->
</ColorArea.Root>
```

```ts [Angular]
import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_AREA_DIRECTIVES } from "@urcolor/angular"; // [!code ++]

@Component({
  selector: "my-area",
  imports: [...COLOR_AREA_DIRECTIVES], // [!code ++]
  template: `
    <!-- [!code ++:9] -->
    <div
      urcColorAreaRoot
      [(value)]="color"
      colorSpace="hsl"
      xChannel="h"
      yChannel="s"
    >
      <!-- children go here -->
    </div>
  `,
})
export class MyArea {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);
}
```

:::

Vue's `v-model` and Angular's `[(value)]` are true two-way bindings. React is one-way plus `onValueChange`. Svelte's `value` is `$bindable`, but `useColor` exposes getters, so bind it with Svelte 5's function form — `bind:value={() => colorState.color, colorState.setColor}` — which is exactly `v-model` for a getter/setter pair.

Angular ships every part of a family as a `COLOR_*_DIRECTIVES` array, so one entry in `imports` brings in the whole set.

- `color-space` / `colorSpace` — the color space to work in (`hsl`, `oklch`, `hsv`, etc.)
- `x-channel` / `xChannel` — the channel mapped to the horizontal axis
- `y-channel` / `yChannel` — the channel mapped to the vertical axis

## Step 3: Add the interaction surface

In Vue, `ColorAreaArea` is the interaction surface: the root owns the state and the
value maths, but every pointer and keyboard listener lives here — and this is the
element the pointer coordinates are measured against. Everything else goes inside
it. React has no separate element; its root is the interaction surface, so the
sizing classes go straight on the root. Svelte and Angular behave like React —
neither package ships an `Area` part, so their roots take the sizing classes too.

::: code-group

```vue [Vue]
<script setup lang="ts">
import {
  useColor,
  ColorAreaRoot,
  ColorAreaArea, // [!code ++]
} from "@urcolor/vue";

const { color } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <ColorAreaRoot
    v-model="color"
    color-space="hsl"
    x-channel="h"
    y-channel="s"
    as="div"
    class="
      relative block h-[200px] w-full cursor-crosshair
      touch-none overflow-clip rounded-lg
    "
  >
    <!-- [!code ++:3] -->
    <ColorAreaArea as="div" class="absolute inset-0">
      <!-- gradient and thumb go here -->
    </ColorAreaArea>
  </ColorAreaRoot>
</template>
```

```tsx [React]
import { useColor, ColorArea } from "@urcolor/react";

function MyArea() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    <ColorArea.Root
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      xChannel="h"
      yChannel="s"
      className=" // [!code ++:4]
        relative h-[200px] w-full cursor-crosshair
        touch-none overflow-clip rounded-lg
      "
    >
      {/* gradient and thumb go here */}
    </ColorArea.Root>
  );
}
```

```svelte{12-15} [Svelte]
<script lang="ts">
  import { ColorArea, useColor } from "@urcolor/svelte";

  const colorState = useColor("hsl(210, 80%, 50%)");
</script>

<ColorArea.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  xChannel="h"
  yChannel="s"
  class="
    relative block h-[200px] w-full cursor-crosshair
    touch-none overflow-clip rounded-lg
  "
>
  <!-- gradient and thumb go here -->
</ColorArea.Root>
```

```ts{15-18} [Angular]
import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_AREA_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "my-area",
  imports: [...COLOR_AREA_DIRECTIVES],
  template: `
    <div
      urcColorAreaRoot
      [(value)]="color"
      colorSpace="hsl"
      xChannel="h"
      yChannel="s"
      class="
        relative block h-[200px] w-full cursor-crosshair
        touch-none overflow-clip rounded-lg
      "
    >
      <!-- gradient and thumb go here -->
    </div>
  `,
})
export class MyArea {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);
}
```

:::

The picker needs a fixed height and `position: relative` so the thumb can be positioned inside it. `touch-none` prevents scroll interference on mobile.

::: warning Vue only
Without `ColorAreaArea` the picker still renders, but it will not respond to
clicks, drags or arrow keys — the root attaches no handlers of its own.
:::

## Step 4: Add the gradient

The gradient renders the 2D gradient on a canvas.

::: code-group

```vue [Vue]
<script setup lang="ts">
import {
  useColor,
  ColorAreaRoot,
  ColorAreaArea,
  ColorAreaGradient, // [!code ++]
} from "@urcolor/vue";

const { color } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <ColorAreaRoot
    v-model="color"
    color-space="hsl"
    x-channel="h"
    y-channel="s"
    as="div"
    class="
      relative block h-[200px] w-full cursor-crosshair
      touch-none overflow-clip rounded-lg
    "
  >
    <ColorAreaArea as="div" class="absolute inset-0">
      <ColorAreaGradient as="div" class="absolute inset-0" /> <!-- [!code ++] -->
    </ColorAreaArea>
  </ColorAreaRoot>
</template>
```

```tsx [React]
import { useColor, ColorArea } from "@urcolor/react";

function MyArea() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    <ColorArea.Root
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      xChannel="h"
      yChannel="s"
      className="
        relative h-[200px] w-full cursor-crosshair
        touch-none overflow-clip rounded-lg
      "
    >
      <ColorArea.Gradient className="absolute inset-0" /> {/* [!code ++] */}
    </ColorArea.Root>
  );
}
```

```svelte [Svelte]
<script lang="ts">
  import { ColorArea, useColor } from "@urcolor/svelte";

  const colorState = useColor("hsl(210, 80%, 50%)");
</script>

<ColorArea.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  xChannel="h"
  yChannel="s"
  class="
    relative block h-[200px] w-full cursor-crosshair
    touch-none overflow-clip rounded-lg
  "
>
  <ColorArea.Gradient class="absolute inset-0" /> <!-- [!code ++] -->
</ColorArea.Root>
```

```ts [Angular]
import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_AREA_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "my-area",
  imports: [...COLOR_AREA_DIRECTIVES],
  template: `
    <div
      urcColorAreaRoot
      [(value)]="color"
      colorSpace="hsl"
      xChannel="h"
      yChannel="s"
      class="
        relative block h-[200px] w-full cursor-crosshair
        touch-none overflow-clip rounded-lg
      "
    >
      <!-- [!code ++] -->
      <canvas urcColorAreaGradient class="absolute inset-0"></canvas>
    </div>
  `,
})
export class MyArea {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);
}
```

:::

In Angular the gradient's selector is `canvas[urcColorAreaGradient]`, so it goes
on a `<canvas>` element you own; the other three render their own canvas for you.
There is no separate `Checkerboard` part in any of the four — the gradient paints
the transparency checkerboard behind itself.

## Step 5: Add the thumb

The thumb is the visible, styled handle. It is the picker's single focusable
element and carries `role="slider"` for screen readers.

::: code-group

```vue [Vue]
<script setup lang="ts">
import {
  useColor,
  ColorAreaRoot,
  ColorAreaArea,
  ColorAreaGradient,
  ColorAreaThumb, // [!code ++]
} from "@urcolor/vue";

const { color } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <ColorAreaRoot
    v-model="color"
    color-space="hsl"
    x-channel="h"
    y-channel="s"
    as="div"
    class="
      relative block h-[200px] w-full cursor-crosshair
      touch-none overflow-clip rounded-lg
    "
  >
    <ColorAreaArea as="div" class="absolute inset-0">
      <ColorAreaGradient as="div" class="absolute inset-0" />
      <!-- [!code ++:8] -->
      <ColorAreaThumb
        as="div"
        class="
          absolute size-5 transform-(--reka-slider-area-thumb-transform)
          rounded-full border-2 border-white
          shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
        "
      />
    </ColorAreaArea>
  </ColorAreaRoot>
</template>
```

```tsx [React]
import { useColor, ColorArea } from "@urcolor/react";

function MyArea() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    <ColorArea.Root
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      xChannel="h"
      yChannel="s"
      className="
        relative h-[200px] w-full cursor-crosshair
        touch-none overflow-clip rounded-lg
      "
    >
      <ColorArea.Gradient className="absolute inset-0" />
      {/* [!code ++:7] */}
      <ColorArea.Thumb
        className="
          absolute size-5
          rounded-full border-2 border-white
          shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
        "
      />
    </ColorArea.Root>
  );
}
```

```svelte [Svelte]
<script lang="ts">
  import { ColorArea, useColor } from "@urcolor/svelte";

  const colorState = useColor("hsl(210, 80%, 50%)");
</script>

<ColorArea.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  xChannel="h"
  yChannel="s"
  class="
    relative block h-[200px] w-full cursor-crosshair
    touch-none overflow-clip rounded-lg
  "
>
  <ColorArea.Gradient class="absolute inset-0" />
  <!-- [!code ++:7] -->
  <ColorArea.Thumb
    class="
      absolute size-5
      rounded-full border-2 border-white
      shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
    "
  />
</ColorArea.Root>
```

```ts [Angular]
import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_AREA_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "my-area",
  imports: [...COLOR_AREA_DIRECTIVES],
  template: `
    <div
      urcColorAreaRoot
      [(value)]="color"
      colorSpace="hsl"
      xChannel="h"
      yChannel="s"
      class="
        relative block h-[200px] w-full cursor-crosshair
        touch-none overflow-clip rounded-lg
      "
    >
      <canvas urcColorAreaGradient class="absolute inset-0"></canvas>
      <!-- [!code ++:8] -->
      <div
        urcColorAreaThumb
        class="
          absolute size-5
          rounded-full border-2 border-white
          shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
        "
      ></div>
    </div>
  `,
})
export class MyArea {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);
}
```

:::

In Vue, `transform-(--reka-slider-area-thumb-transform)` applies a CSS variable the
component sets to position the thumb at the correct coordinates; React's thumb
positions itself. Svelte and Angular are like React: their thumbs read that same
variable from the root's own style, so you only need the visual classes.

::: tip
All components are completely unstyled — the classes above are just an example using Tailwind CSS. Use any styling approach you prefer.
:::

## Switching color spaces

You can change the color space and channel mapping to get completely different picker behavior. For example, switch from HSL to OKLCh:

::: code-group

```vue{5,11-13} [Vue]
<script setup lang="ts">
import { useColor } from "@urcolor/vue";

const { color } = useColor("oklch(0.6 0.15 210)");
</script>

<template>
  <ColorAreaRoot
    v-model="color"
    color-space="oklch"
    x-channel="c"
    y-channel="l"
  >
    <!-- ... -->
  </ColorAreaRoot>
</template>
```

```tsx{5,11-13} [React]
const { color, setColor } = useColor("oklch(0.6 0.15 210)");

<ColorArea.Root
  value={color}
  onValueChange={setColor}
  colorSpace="oklch"
  xChannel="c"
  yChannel="l"
>
  {/* ... */}
</ColorArea.Root>
```

```svelte{4,9-11} [Svelte]
<script lang="ts">
  import { useColor } from "@urcolor/svelte";

  const colorState = useColor("oklch(0.6 0.15 210)");
</script>

<ColorArea.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="oklch"
  xChannel="c"
  yChannel="l"
>
  <!-- ... -->
</ColorArea.Root>
```

```ts{12-14,21} [Angular]
import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_AREA_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "my-area",
  imports: [...COLOR_AREA_DIRECTIVES],
  template: `
    <div
      urcColorAreaRoot
      [(value)]="color"
      colorSpace="oklch"
      xChannel="c"
      yChannel="l"
    >
      <!-- ... -->
    </div>
  `,
})
export class MyArea {
  protected readonly color = signal<Color>(Color.parse("oklch(0.6 0.15 210)")!);
}
```

:::

Or map different HSL channels to create a saturation × lightness picker:

::: code-group

```vue{5,6} [Vue]
<template>
  <ColorAreaRoot
    v-model="color"
    color-space="hsl"
    x-channel="s"
    y-channel="l"
  >
    <!-- ... -->
  </ColorAreaRoot>
</template>
```

```tsx{5,6} [React]
<ColorArea.Root
  value={color}
  onValueChange={setColor}
  colorSpace="hsl"
  xChannel="s"
  yChannel="l"
>
  {/* ... */}
</ColorArea.Root>
```

```svelte{4,5} [Svelte]
<ColorArea.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  xChannel="s"
  yChannel="l"
>
  <!-- ... -->
</ColorArea.Root>
```

```html{5,6} [Angular]
<div
  urcColorAreaRoot
  [(value)]="color"
  colorSpace="hsl"
  xChannel="s"
  yChannel="l"
>
  <!-- ... -->
</div>
```

:::

## Inverting axis direction

Reverse the direction of the horizontal or vertical axis to map from right-to-left (for x) or bottom-to-top (for y) instead of the default direction.

::: code-group

```vue{7-8} [Vue]
<template>
  <ColorAreaRoot
    v-model="color"
    color-space="hsl"
    x-channel="h"
    y-channel="l"
    :x-inverted="true"
    :y-inverted="true"
  >
    <!-- ... -->
  </ColorAreaRoot>
</template>
```

```tsx{7-8} [React]
<ColorArea.Root
  value={color}
  onValueChange={setColor}
  colorSpace="hsl"
  xChannel="h"
  yChannel="l"
  xInverted
  yInverted
>
  {/* ... */}
</ColorArea.Root>
```

```svelte{6,7} [Svelte]
<ColorArea.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  xChannel="h"
  yChannel="l"
  xInverted
  yInverted
>
  <!-- ... -->
</ColorArea.Root>
```

```html{7,8} [Angular]
<div
  urcColorAreaRoot
  [(value)]="color"
  colorSpace="hsl"
  xChannel="h"
  yChannel="l"
  xInverted
  yInverted
>
  <!-- ... -->
</div>
```

:::

## Listening to changes

Vue emits `@change` on every change, including mid-drag, and `@change-end` on
release. React calls `onValueChange` while dragging and `onValueCommit` on release.
Svelte does the same as React; Angular emits `(valueChange)` while dragging and
`(valueCommit)` on release. Angular's `(valueChange)` is the output half of
`[(value)]`, so when you listen to it explicitly you bind the input one-way as
`[value]="color()"` and write the signal yourself.

::: code-group

```vue{3-8,17-18} [Vue]
<script setup lang="ts">
// ...
const onColorChange = (color: Color) => {
  console.log("dragging", color.toString());
};
const onColorChangeEnd = (color: Color) => {
  console.log("committed", color.toString());
};
</script>

<template>
  <ColorAreaRoot
    v-model="color"
    color-space="hsl"
    x-channel="h"
    y-channel="s"
    @change="onColorChange"
    @change-end="onColorChangeEnd"
  >
    <!-- ... -->
  </ColorAreaRoot>
</template>
```

```tsx{3-8,15-16} [React]
import { Color } from "@urcolor/core";

const onColorChange = (color: Color) => {
  console.log("dragging", color.toString());
};
const onColorCommit = (color: Color) => {
  console.log("committed", color.toString());
};

<ColorArea.Root
  value={color}
  onValueChange={onColorChange}
  onValueCommit={onColorCommit}
  colorSpace="hsl"
  xChannel="h"
  yChannel="s"
>
  {/* ... */}
</ColorArea.Root>
```

```svelte{4-9,17-18} [Svelte]
<script lang="ts">
  import type { Color } from "@urcolor/core";
  // ...
  const onColorChange = (color: Color) => {
    console.log("dragging", color.toString());
  };
  const onColorCommit = (color: Color) => {
    console.log("committed", color.toString());
  };
</script>

<ColorArea.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  xChannel="h"
  yChannel="s"
  onValueChange={onColorChange}
  onValueCommit={onColorCommit}
>
  <!-- ... -->
</ColorArea.Root>
```

```ts{12-13,25-32} [Angular]
import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_AREA_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "my-area",
  imports: [...COLOR_AREA_DIRECTIVES],
  template: `
    <div
      urcColorAreaRoot
      [value]="color()"
      (valueChange)="onColorChange($event)"
      (valueCommit)="onColorCommit($event)"
      colorSpace="hsl"
      xChannel="h"
      yChannel="s"
    >
      <!-- ... -->
    </div>
  `,
})
export class MyArea {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);

  protected onColorChange(color: Color): void {
    this.color.set(color);
    console.log("dragging", color.toString());
  }

  protected onColorCommit(color: Color): void {
    console.log("committed", color.toString());
  }
}
```

:::

In Vue, `@update:model-value` and `@update:color` fire alongside `@change`; use
whichever suits your binding style.

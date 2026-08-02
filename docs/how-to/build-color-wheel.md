# How to Build a Color Wheel

Let's build a 2D color wheel step by step.

<script setup>
import ColorWheelGuide from './demo/vue/ColorWheelGuide.vue'
</script>

Here's what we'll end up with:

<ColorWheelGuide />

<details>
<summary>Click to view the full code</summary>

::: code-group

<<< @/how-to/demo/vue/ColorWheelGuide.vue [Vue]
<<< @/how-to/demo/react/ColorWheelGuide.tsx [React]
<<< @/how-to/demo/svelte/ColorWheelGuide.svelte [Svelte]
<<< @/how-to/demo/angular/color-wheel-guide.ts [Angular]

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

function MyWheel() {
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
  selector: "my-wheel",
  template: ``,
})
export class MyWheel {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!); // [!code ++]
}
```

:::

`useColor()` creates color state from any CSS color string. Vue returns a `{ color }` shallow ref; React returns `{ color, setColor }`; Svelte returns a rune-backed object whose `color`, `hex` and `alpha` are **getters** — keep the object (`colorState.color`) rather than destructuring it, or you lose reactivity. Angular has no hook: a plain `signal<Color>()` is the state, and `[(value)]` binds to it directly.

## Step 2: Add the root

The root manages all the state and interactions. Tell it which color space and channels to map to the angle and radius.

::: code-group

```vue [Vue]
<script setup lang="ts">
import { useColor, ColorWheelRoot } from "@urcolor/vue"; // [!code ++]

const { color } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <!-- [!code ++:8] -->
  <ColorWheelRoot
    v-model="color"
    color-space="hsl"
    angle-channel="h"
    radius-channel="s"
  >
    <!-- children go here -->
  </ColorWheelRoot>
</template>
```

```tsx [React]
import { useColor, ColorWheel } from "@urcolor/react"; // [!code ++]

function MyWheel() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    // [!code ++:8]
    <ColorWheel.Root
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      channelAngle="h"
      channelRadius="s"
    >
      {/* children go here */}
    </ColorWheel.Root>
  );
}
```

```svelte [Svelte]
<script lang="ts">
  import { ColorWheel, useColor } from "@urcolor/svelte"; // [!code ++]

  const colorState = useColor("hsl(210, 80%, 50%)");
</script>

<!-- [!code ++:8] -->
<ColorWheel.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  angleChannel="h"
  radiusChannel="s"
>
  <!-- children go here -->
</ColorWheel.Root>
```

```ts [Angular]
import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_WHEEL_DIRECTIVES } from "@urcolor/angular"; // [!code ++]

@Component({
  selector: "my-wheel",
  imports: [...COLOR_WHEEL_DIRECTIVES], // [!code ++]
  template: `
    <!-- [!code ++:9] -->
    <div
      urcColorWheelRoot
      [(value)]="color"
      colorSpace="hsl"
      angleChannel="h"
      radiusChannel="s"
    >
      <!-- children go here -->
    </div>
  `,
})
export class MyWheel {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);
}
```

:::

Vue's `v-model` and Angular's `[(value)]` are true two-way bindings. React is one-way plus `onValueChange`. Svelte's `value` is `$bindable`, but `useColor` exposes getters, so bind it with Svelte 5's function form — `bind:value={() => colorState.color, colorState.setColor}` — which is exactly `v-model` for a getter/setter pair.

Angular ships every part of a family as a `COLOR_*_DIRECTIVES` array, so one entry in `imports` brings in the whole set.

- `color-space` / `colorSpace` — the color space to work in (`hsl`, `oklch`, etc.)
- `angle-channel` / `channelAngle` / `angleChannel` — the channel mapped to the angular axis (rotation)
- `radius-channel` / `channelRadius` / `radiusChannel` — the channel mapped to the radial axis (distance from center)

React names these two props `channelAngle` / `channelRadius`; Vue, Svelte, and Angular all name them `angleChannel` / `radiusChannel` (kebab-cased in Vue templates).

## Step 3: Add the gradient

The gradient renders the 2D circular gradient on a canvas. In Angular the gradient's selector is `canvas[urcColorWheelGradient]`, so it goes on a `<canvas>` element you own; the other three render their own canvas for you.

::: code-group

```vue [Vue]
<script setup lang="ts">
import {
  useColor,
  ColorWheelRoot,
  ColorWheelGradient, // [!code ++]
} from "@urcolor/vue";

const { color } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <ColorWheelRoot
    v-model="color"
    color-space="hsl"
    angle-channel="h"
    radius-channel="s"
    class="relative block size-64 overflow-hidden rounded-full"
    style="container-type: inline-size"
  >
    <ColorWheelGradient class="absolute inset-0 block" /> <!-- [!code ++] -->
  </ColorWheelRoot>
</template>
```

```tsx [React]
import { useColor, ColorWheel } from "@urcolor/react";

function MyWheel() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    <ColorWheel.Root
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      channelAngle="h"
      channelRadius="s"
      className="relative block size-64 overflow-hidden rounded-full"
      style={{ containerType: "inline-size" }}
    >
      <ColorWheel.Gradient className="absolute inset-0 block" /> {/* [!code ++] */}
    </ColorWheel.Root>
  );
}
```

```svelte [Svelte]
<script lang="ts">
  import { ColorWheel, useColor } from "@urcolor/svelte";

  const colorState = useColor("hsl(210, 80%, 50%)");
</script>

<ColorWheel.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  angleChannel="h"
  radiusChannel="s"
  class="relative block size-64 overflow-hidden rounded-full"
  style="container-type: inline-size"
>
  <ColorWheel.Gradient class="absolute inset-0 block" /> <!-- [!code ++] -->
</ColorWheel.Root>
```

```ts [Angular]
import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_WHEEL_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "my-wheel",
  imports: [...COLOR_WHEEL_DIRECTIVES],
  template: `
    <div
      urcColorWheelRoot
      [(value)]="color"
      colorSpace="hsl"
      angleChannel="h"
      radiusChannel="s"
      class="relative block size-64 overflow-hidden rounded-full"
      style="container-type: inline-size"
    >
      <!-- [!code ++:1] -->
      <canvas urcColorWheelGradient class="absolute inset-0 block"></canvas>
    </div>
  `,
})
export class MyWheel {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);
}
```

:::

The root needs `overflow-hidden rounded-full` to clip the gradient to a circle, and `container-type: inline-size` so the component can calculate dimensions correctly.

## Step 4: Add the thumb

The thumb is the draggable handle. It's positioned automatically within the wheel.

::: code-group

```vue [Vue]
<script setup lang="ts">
import {
  useColor,
  ColorWheelRoot,
  ColorWheelGradient,
  ColorWheelThumb, // [!code ++]
} from "@urcolor/vue";

const { color } = useColor("hsl(210, 80%, 50%)");
</script>

<template>
  <ColorWheelRoot
    v-model="color"
    color-space="hsl"
    angle-channel="h"
    radius-channel="s"
    class="relative block size-64 overflow-hidden rounded-full"
    style="container-type: inline-size"
  >
    <ColorWheelGradient class="absolute inset-0 block" />
    <!-- [!code ++:8] -->
    <ColorWheelThumb
      class="
        size-4 rounded-full border-2 border-white
        shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
        focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
      "
      aria-label="Color"
    />
  </ColorWheelRoot>
</template>
```

```tsx [React]
import { useColor, ColorWheel } from "@urcolor/react";

function MyWheel() {
  const { color, setColor } = useColor("hsl(210, 80%, 50%)");

  return (
    <ColorWheel.Root
      value={color}
      onValueChange={setColor}
      colorSpace="hsl"
      channelAngle="h"
      channelRadius="s"
      className="relative block size-64 overflow-hidden rounded-full"
      style={{ containerType: "inline-size" }}
    >
      <ColorWheel.Gradient className="absolute inset-0 block" />
      {/* [!code ++:8] */}
      <ColorWheel.Thumb
        className="
          size-4 rounded-full border-2 border-white
          shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
          focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
        "
        aria-label="Color"
      />
    </ColorWheel.Root>
  );
}
```

```svelte [Svelte]
<script lang="ts">
  import { ColorWheel, useColor } from "@urcolor/svelte";

  const colorState = useColor("hsl(210, 80%, 50%)");
</script>

<ColorWheel.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  angleChannel="h"
  radiusChannel="s"
  class="relative block size-64 overflow-hidden rounded-full"
  style="container-type: inline-size"
>
  <ColorWheel.Gradient class="absolute inset-0 block" />
  <!-- [!code ++:8] -->
  <ColorWheel.Thumb
    class="
      size-4 rounded-full border-2 border-white
      shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
      focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
    "
    aria-label="Color"
  />
</ColorWheel.Root>
```

```ts [Angular]
import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_WHEEL_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "my-wheel",
  imports: [...COLOR_WHEEL_DIRECTIVES],
  template: `
    <div
      urcColorWheelRoot
      [(value)]="color"
      colorSpace="hsl"
      angleChannel="h"
      radiusChannel="s"
      class="relative block size-64 overflow-hidden rounded-full"
      style="container-type: inline-size"
    >
      <canvas urcColorWheelGradient class="absolute inset-0 block"></canvas>
      <!-- [!code ++:9] -->
      <div
        urcColorWheelThumb
        class="
          size-4 rounded-full border-2 border-white
          shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
          focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
        "
        aria-label="Color"
      ></div>
    </div>
  `,
})
export class MyWheel {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);
}
```

:::

All four bindings ship a **single combined** `Thumb` for the wheel: one handle drives both axes, so there is no separate thumb per channel.

::: tip
All components are completely unstyled — the classes above are just an example using Tailwind CSS. Use any styling approach you prefer.
:::

## Start angle offset

Rotate where the wheel gradient begins (in degrees):

::: code-group

```vue{5} [Vue]
<template>
  <ColorWheelRoot
    v-model="color"
    color-space="hsl"
    :start-angle="90"
    angle-channel="h"
    radius-channel="s"
  >
    <!-- ... -->
  </ColorWheelRoot>
</template>
```

```tsx{5} [React]
<ColorWheel.Root
  value={color}
  onValueChange={setColor}
  colorSpace="hsl"
  startAngle={90}
  channelAngle="h"
  channelRadius="s"
>
  {/* ... */}
</ColorWheel.Root>
```

```svelte{4} [Svelte]
<ColorWheel.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  startAngle={90}
  angleChannel="h"
  radiusChannel="s"
>
  <!-- ... -->
</ColorWheel.Root>
```

```html{5} [Angular]
<div
  urcColorWheelRoot
  [(value)]="color"
  colorSpace="hsl"
  startAngle="90"
  angleChannel="h"
  radiusChannel="s"
>
  <!-- ... -->
</div>
```

:::

## Different color spaces

Switch the color space and channel mapping for different wheel behaviors. For example, OKLCh:

::: code-group

```vue{4,10-12} [Vue]
<script setup lang="ts">
import { useColor } from "@urcolor/vue";

const { color } = useColor("oklch(0.6 0.15 210)");
</script>

<template>
  <ColorWheelRoot
    v-model="color"
    color-space="oklch"
    angle-channel="h"
    radius-channel="c"
  >
    <!-- ... -->
  </ColorWheelRoot>
</template>
```

```tsx{1,6-8} [React]
const { color, setColor } = useColor("oklch(0.6 0.15 210)");

<ColorWheel.Root
  value={color}
  onValueChange={setColor}
  colorSpace="oklch"
  channelAngle="h"
  channelRadius="c"
>
  {/* ... */}
</ColorWheel.Root>
```

```svelte{4,9-11} [Svelte]
<script lang="ts">
  import { useColor } from "@urcolor/svelte";

  const colorState = useColor("oklch(0.6 0.15 210)");
</script>

<ColorWheel.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="oklch"
  angleChannel="h"
  radiusChannel="c"
>
  <!-- ... -->
</ColorWheel.Root>
```

```ts{12-14,21} [Angular]
import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_WHEEL_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "my-wheel",
  imports: [...COLOR_WHEEL_DIRECTIVES],
  template: `
    <div
      urcColorWheelRoot
      [(value)]="color"
      colorSpace="oklch"
      angleChannel="h"
      radiusChannel="c"
    >
      <!-- ... -->
    </div>
  `,
})
export class MyWheel {
  protected readonly color = signal<Color>(Color.parse("oklch(0.6 0.15 210)")!);
}
```

:::

## Listening to changes

Vue emits `@update:model-value` while dragging and `@change-end` on release; React and Svelte both call `onValueChange` while dragging and `onValueCommit` on release; Angular emits `(valueChange)` while dragging and `(valueCommit)` on release. Angular's `(valueChange)` is the output half of `[(value)]`, so when you listen to it explicitly you bind the input one-way as `[value]="color()"` and write the signal yourself.

::: code-group

```vue{3-8,15-16} [Vue]
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
  <ColorWheelRoot
    v-model="color"
    color-space="hsl"
    @update:model-value="onColorChange"
    @change-end="onColorChangeEnd"
    angle-channel="h"
    radius-channel="s"
  >
    <!-- ... -->
  </ColorWheelRoot>
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

<ColorWheel.Root
  value={color}
  onValueChange={onColorChange}
  onValueCommit={onColorCommit}
  colorSpace="hsl"
  channelAngle="h"
  channelRadius="s"
>
  {/* ... */}
</ColorWheel.Root>
```

```svelte{4-9,15-16} [Svelte]
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

<ColorWheel.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  onValueChange={onColorChange}
  onValueCommit={onColorCommit}
  angleChannel="h"
  radiusChannel="s"
>
  <!-- ... -->
</ColorWheel.Root>
```

```ts{12-13,25-32} [Angular]
import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_WHEEL_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "my-wheel",
  imports: [...COLOR_WHEEL_DIRECTIVES],
  template: `
    <div
      urcColorWheelRoot
      [value]="color()"
      (valueChange)="onColorChange($event)"
      (valueCommit)="onColorCommit($event)"
      colorSpace="hsl"
      angleChannel="h"
      radiusChannel="s"
    >
      <!-- ... -->
    </div>
  `,
})
export class MyWheel {
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

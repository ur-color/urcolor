# ColorSwatch

A color preview element that displays a color with a checkerboard background for visualizing alpha transparency.

## Preview

```svelte
<script lang="ts">
  import { ColorSwatch } from "@urcolor/svelte";

  const colors = [
    "hsl(210, 80%, 50%)",
    "hsl(350, 90%, 60%)",
    "hsl(120, 60%, 45%)",
    "hsla(45, 100%, 55%, 0.5)",
  ];
</script>

<div class="flex items-center gap-3">
  {#each colors as color (color)}
    <ColorSwatch value={color} alpha class="size-10 rounded-lg" />
  {/each}
</div>
```

`ColorSwatch` decides once, at creation, whether it is a static sample or a toggle button: it becomes a toggle when `pressed` or `onPressedChange` is supplied, and stays a `role="img"` element otherwise. That inference is deliberately untracked — `pressed` becomes defined the moment a swatch is toggled, so reading it reactively would flip a static swatch into a button mid-life. Pass `toggle` explicitly when you want to decide yourself.

## Anatomy

```svelte
<ColorSwatch />
```

A single component with no sub-parts. It renders a `<div>` when static and a `<button>` when interactive.

## Examples

### Alpha transparency

`alpha` reflects the color's alpha channel so the checkerboard shows through. Without it the swatch paints the color fully opaque.

```svelte
<ColorSwatch value="hsla(45, 100%, 55%, 0.5)" alpha class="size-10 rounded-lg" />
<ColorSwatch value="hsla(45, 100%, 55%, 0.5)" class="size-10 rounded-lg" />
```

### Tile size

`checkerSize` is the transparency grid's tile size in pixels, and writes `--urcolor-checkerboard-size`. Left unset, that property is free for a stylesheet to own and falls back to `16px`.

```svelte
<ColorSwatch value="hsla(210, 80%, 50%, 0.35)" alpha checkerSize={8} class="size-10 rounded-lg" />
```

### Toggle

Binding `pressed` turns the swatch into a self-contained toggle button. It owns its own pressed state, so it works with or without a `ColorSwatchGroup` around it.

```svelte
<script lang="ts">
  import { ColorSwatch } from "@urcolor/svelte";

  let selected = $state(false);
</script>

<ColorSwatch
  value="hsl(210, 80%, 50%)"
  bind:pressed={selected}
  class="size-10 rounded-lg data-[pressed]:ring-2 data-[pressed]:ring-black"
/>
```

`onPressedChange` alone is enough to make it a toggle if you would rather not bind:

```svelte
<ColorSwatch value="hsl(210, 80%, 50%)" onPressedChange={(pressed) => console.log(pressed)} />
```

### Disabled

`disabled` refuses both the click and the Enter/Space activation, and drops the tab stop.

```svelte
<ColorSwatch value="hsl(210, 80%, 50%)" bind:pressed={selected} disabled class="size-10 rounded-lg" />
```

### Content

The default children render inside the swatch, which is how a selection checkmark is usually layered over the color.

```svelte
<ColorSwatch value="hsl(210, 80%, 50%)" bind:pressed={selected} class="flex size-10 items-center justify-center rounded-lg">
  {#if selected}
    <svg viewBox="0 0 24 24" class="size-5 stroke-white" fill="none" stroke-width="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  {/if}
</ColorSwatch>
```

### Render delegation

The `child` snippet replaces the element the swatch would have rendered. The snippet receives the props the component built, including its behaviour attachment, so spreading them is what keeps the part working.

```svelte
<ColorSwatch value="hsl(210, 80%, 50%)" bind:pressed={selected}>
  {#snippet child({ props })}
    <button {...props}>
      <span class="sr-only">Blue</span>
    </button>
  {/snippet}
</ColorSwatch>
```

The toggle behaviour rides along under a `Symbol` key inside `props`, so it survives the spread onto your own element — or onto another component.

## API Reference

`ColorSwatch` is the whole family — a single component exported directly from `@urcolor/svelte`. There is no `ColorSwatch.*` namespace, no sub-part, and no context to read.

### ColorSwatch

Renders a color preview with an automatic checkerboard background. Static by default; a toggle button once `pressed` or `onPressedChange` is supplied.

Extends `HTMLAttributes<HTMLElement>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Color \| string \| null` | — | The color to display. Accepts a `Color` or any CSS color string. |
| `checkerSize` | `number` | `16` | The checkerboard tile size, in pixels. |
| `alpha` | `boolean` | `false` | When true, reflects the color's alpha channel; otherwise it paints fully opaque. |
| `disabled` | `boolean` | `false` | Prevents the user from interacting with the swatch. |
| `toggle` | `boolean` | Inferred | Forces toggle behaviour on or off. Left unset, it resolves to `true` when `pressed` or `onPressedChange` is supplied. |
| `pressed` | `boolean` | `false` | Whether the swatch is selected. Bindable with `bind:pressed`. |
| `onPressedChange` | `(pressed: boolean) => void` | — | Called whenever the pressed state flips. |
| `class` | `string` | — | Class applied to the rendered element. |
| `style` | `string` | — | Inline styles, appended after the generated ones so your declarations win the cascade. |
| `children` | `Snippet` | — | Rendered inside the swatch, e.g. a selection checkmark. |
| `child` | `Snippet<[ChildSnippetArgs]>` | — | Replaces the default element; receives the props it would have received. |

::: tip
The swatch is not coupled to `ColorSwatchGroup`. The group finds its items by DOM shape — a native button, an explicit `role="button"`, or anything carrying a tab stop — so a toggle swatch works identically inside and outside one.
:::

### Data Attributes

| Attribute | Present when |
|-----------|--------------|
| `data-pressed` | The swatch is interactive **and** selected. A static swatch never carries it. |
| `data-disabled` | `disabled` is set, whether the swatch is interactive or not. |

### CSS Variables

| Variable | Description |
|----------|-------------|
| `--urcolor-swatch-color` | The painted color, honouring `alpha`. `transparent` when there is no color. |
| `--urcolor-swatch-color-opaque` | The same color forced to alpha 1. |
| `--urcolor-swatch-alpha` | The color's alpha channel, `1` when there is no color. |
| `--urcolor-swatch-checkerboard` | The transparency grid painted under the color. |
| `--urcolor-swatch-background` | The composited `background`, built from the four above. |

All five are always emitted, including when the value is absent or
unparseable, so your styling never has to guard for a missing variable. The
unprefixed `--swatch-color`, `--swatch-color-opaque`, `--swatch-alpha` and
`--swatch-checkerboard` are still emitted as aliases of their replacements and
are deprecated.

The grid itself reads three further properties, and no component writes them,
so a rule anywhere above the element wins:

| Variable | Default | Description |
|----------|---------|-------------|
| `--urcolor-checkerboard-dark` | `rgb(230, 230, 230)` | The darker of the two checks. |
| `--urcolor-checkerboard-light` | `white` | The lighter of the two checks. |
| `--urcolor-checkerboard-size` | `16px` | The tile size. `checkerSize` writes it inline, which beats a stylesheet. |

## Accessibility

A static swatch is a purely visual element with `role="img"` — not focusable, no keyboard behaviour. A toggle swatch is a real `<button type="button">` carrying `aria-pressed`, so it is announced and operated as a toggle.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="img"` | Applied only to a static swatch. An interactive swatch is a native `<button>` and needs no role. |
| `type="button"` | Applied to an interactive swatch, so it never submits an enclosing form. |
| `aria-pressed` | The selection state, on interactive swatches only. |
| `aria-disabled` | Applied to an interactive swatch when `disabled` is set, alongside the native `disabled` attribute. |
| `tabindex` | `0` on an interactive swatch, and dropped entirely when it is disabled. |
| `aria-label` | **Not generated.** Both `role="img"` and a button need an accessible name, so pass your own `aria-label`, or render text inside the swatch. |

::: warning Provide an accessible name
The Svelte swatch does not derive a label from the color. Supply `aria-label` — for example `aria-label="Blue"` or the CSS color string — or the swatch has no accessible name.
:::

### Keyboard Navigation

Only an interactive swatch takes keyboard input. Arrow-key movement between swatches belongs to `ColorSwatchGroupRoot`, which handles the keys as they bubble up from its items.

| Key | Action |
|-----|--------|
| Tab | Move focus to the swatch, unless it is static or disabled |
| Enter | Toggle the pressed state |
| Space | Toggle the pressed state |

Enter and Space call `preventDefault`, which suppresses the click a native button would otherwise synthesise — without it every keyboard activation would toggle twice.

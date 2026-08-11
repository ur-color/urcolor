# ColorField

A numeric input component for editing a single color channel, with optional stepper buttons and a color swatch preview.

## Preview

```svelte
<script lang="ts">
  import { ColorField, useColor } from "@urcolor/svelte";

  const colorState = useColor("hsl(210, 80%, 50%)");
</script>

<ColorField.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  channel="h"
  class="flex items-center overflow-hidden rounded-md border"
>
  <ColorField.Swatch value={colorState.color} class="size-4 rounded-sm" />
  <ColorField.Decrement class="px-2">&minus;</ColorField.Decrement>
  <ColorField.Input aria-label="Hue" class="w-16 bg-transparent text-center font-mono outline-none" />
  <ColorField.Increment class="px-2">+</ColorField.Increment>
</ColorField.Root>
```

`useColor` returns an object whose `color`, `hex` and `alpha` members are **getters**, not refs. Keep the object rather than destructuring it, and bind with Svelte 5's function form — `bind:value={() => colorState.color, colorState.setColor}` — which pairs the getter with the setter.

## Anatomy

```svelte
<ColorField.Root>
  <ColorField.Swatch />
  <ColorField.Decrement />
  <ColorField.Input />
  <ColorField.Increment />
</ColorField.Root>
```

`ColorField.Swatch` takes its own `value` and reads nothing from the root's context, so it can sit anywhere in the tree — inside the root, or beside it.

## Examples

### Hex input

`format="hex"` switches the field from editing one channel to editing the whole color as a `#rrggbb` string. In that mode `channel` is not read at all.

```svelte
<ColorField.Root
  bind:value={() => colorState.color, colorState.setColor}
  format="hex"
  class="flex h-8 items-center overflow-hidden rounded-md border px-3"
>
  <ColorField.Input aria-label="Hex" class="min-w-0 flex-1 bg-transparent font-mono outline-none" />
</ColorField.Root>
```

### HSL channel fields

One root per channel, each bound to the same color state. The steppers are disabled automatically once a value reaches its bound.

```svelte
<script lang="ts">
  import { ColorField, useColor } from "@urcolor/svelte";

  const colorState = useColor("hsl(210, 80%, 50%)");
  const channels = [
    { key: "h", label: "Hue" },
    { key: "s", label: "Saturation" },
    { key: "l", label: "Lightness" },
  ];
</script>

<div class="flex gap-2">
  {#each channels as channel (channel.key)}
    <ColorField.Root
      bind:value={() => colorState.color, colorState.setColor}
      colorSpace="hsl"
      channel={channel.key}
      class="flex items-center rounded-md border"
    >
      <ColorField.Decrement class="px-2">&minus;</ColorField.Decrement>
      <ColorField.Input aria-label={channel.label} class="w-16 bg-transparent text-center outline-none" />
      <ColorField.Increment class="px-2">+</ColorField.Increment>
    </ColorField.Root>
  {/each}
</div>
```

### Alpha channel

`channel="alpha"` edits opacity. It is not a channel of any color space — the root special-cases it and presents it as a `0–100` percentage.

```svelte
<ColorField.Root
  bind:value={() => colorState.color, colorState.setColor}
  channel="alpha"
  class="flex items-center rounded-md border"
>
  <ColorField.Swatch value={colorState.color} alpha class="size-4 rounded-sm" />
  <ColorField.Decrement class="px-2">&minus;</ColorField.Decrement>
  <ColorField.Input aria-label="Alpha" class="w-16 bg-transparent text-center outline-none" />
  <ColorField.Increment class="px-2">+</ColorField.Increment>
</ColorField.Root>
```

### Bounds and step

`min`, `max` and `step` all default to the resolved channel's own configuration. Setting them narrows the range the field will accept and changes how far one arrow press moves.

```svelte
<ColorField.Root
  bind:value={() => colorState.color, colorState.setColor}
  colorSpace="hsl"
  channel="l"
  min={20}
  max={80}
  step={5}
>
  <ColorField.Input aria-label="Lightness" />
</ColorField.Root>
```

### Read-only and disabled

`readOnly` shows the value but refuses edits; `disabled` refuses focus as well. Both propagate to the input and to the two steppers.

```svelte
<ColorField.Root bind:value={() => colorState.color, colorState.setColor} readOnly>
  <ColorField.Decrement>&minus;</ColorField.Decrement>
  <ColorField.Input aria-label="Hue" />
  <ColorField.Increment>+</ColorField.Increment>
</ColorField.Root>
```

### Render delegation

Every part accepts a `child` snippet that replaces the element it would have rendered. The snippet receives the props the part built, including its behaviour attachment, so spreading them is what keeps the part working.

```svelte
<ColorField.Root bind:value={() => colorState.color, colorState.setColor}>
  {#snippet child({ props })}
    <fieldset {...props}>
      <ColorField.Input>
        {#snippet child({ props })}
          <input {...props} aria-label="Hue" />
        {/snippet}
      </ColorField.Input>
      <ColorField.Increment>
        {#snippet child({ props })}
          <button {...props}>+</button>
        {/snippet}
      </ColorField.Increment>
    </fieldset>
  {/snippet}
</ColorField.Root>
```

## API Reference

Every part is also exported unnamespaced — `ColorFieldRoot`, `ColorFieldInput`, `ColorFieldIncrement`, `ColorFieldDecrement`, `ColorFieldSwatch` — alongside the `ColorField.*` namespace. The root's context is readable with `colorFieldContext.get()`, and the display format union is exported as `ColorFieldFormat`.

### ColorField.Root

The root container. Owns the color, the field's own numeric and text state, and every operation the other parts invoke. Renders a `<div>`.

Extends `HTMLAttributes<HTMLDivElement>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Color \| string \| null` | — | The color value. Bindable with `bind:value`. |
| `defaultValue` | `Color \| string \| null` | — | The color used until the first interaction when `value` is not bound. |
| `colorSpace` | `SpaceId` | `'hsl'` | The color space the field operates in. |
| `channel` | `string` | `'h'` | The channel this field controls, or `'alpha'`. Not read when `format` is `'hex'`. |
| `format` | `ColorFieldFormat` | Auto | `'number' \| 'degree' \| 'percentage' \| 'hex'`. Derived from the channel config when unset; `'hex'` is never derived and switches the field to editing the whole color. |
| `min` | `number` | Auto | Minimum value, in display units. Falls back to the channel config, then `0`. |
| `max` | `number` | Auto | Maximum value, in display units. Falls back to the channel config, then `0xffffff` in hex mode and `100` otherwise. |
| `step` | `number` | Auto | Step for arrow keys and the steppers. Falls back to the channel config, then `1`. |
| `disabled` | `boolean` | `false` | Prevents the user from interacting with the field. |
| `readOnly` | `boolean` | `false` | Shows the value but refuses edits. |
| `onValueChange` | `(color: Color) => void` | — | Called on every change, including mid-typing. |
| `onValueCommit` | `(color: Color) => void` | — | Called once at the end of an interaction: blur, Enter, an arrow key, or a stepper press. |
| `class` | `string` | — | Class applied to the rendered element. |
| `child` | `Snippet<[ChildSnippetArgs]>` | — | Replaces the default element; receives the props it would have received. |

### ColorField.Input

The editable text surface. Renders an `<input type="text" role="spinbutton">` and owns the keyboard map, the blur/Enter commit, and the select-on-focus behaviour.

It is a `spinbutton` rather than `type="number"` because the field renders suffixed text — `210°`, `50%`, `#ff8800` — that a numeric input would reject.

Extends `HTMLInputAttributes`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `class` | `string` | — | Class applied to the rendered element. |
| `child` | `Snippet<[ChildSnippetArgs]>` | — | Replaces the default element; receives the props it would have received. |

The part sets `value`, `disabled`, `readonly`, `autocomplete="off"`, `autocorrect="off"`, `spellcheck={false}` and `inputmode="text"` itself. It does **not** generate an accessible name, so pass your own `aria-label`.

### ColorField.Increment

Steps the value up by `step`. Renders a `<button type="button">` with `tabindex="-1"` — the input owns the field's tab stop, so the steppers are pointer affordances only.

Holding the button repeats: one step immediately, a `400`ms pause, then a step every `60`ms. The release listeners live on `window`, so a pointer that leaves the button before lifting still ends the hold.

Extends `HTMLButtonAttributes`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `aria-label` | `string` | `'Increase'` | Overrides the default label. |
| `class` | `string` | — | Class applied to the rendered element. |
| `child` | `Snippet<[ChildSnippetArgs]>` | — | Replaces the default element; receives the props it would have received. |

The button disables itself when the root is disabled or read-only, or when the value already sits at `max`.

### ColorField.Decrement

Steps the value down by `step`. Identical to `ColorField.Increment` in every respect except direction.

Extends `HTMLButtonAttributes`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `aria-label` | `string` | `'Decrease'` | Overrides the default label. |
| `class` | `string` | — | Class applied to the rendered element. |
| `child` | `Snippet<[ChildSnippetArgs]>` | — | Replaces the default element; receives the props it would have received. |

The button disables itself when the root is disabled or read-only, or when the value already sits at `min`.

### ColorField.Swatch

A read-only preview of a color, rendered as a `<span role="img">`. The color is painted as a flat `linear-gradient` layered over a checkerboard, so a translucent value shows the checks through it.

Extends `Omit<HTMLAttributes<HTMLSpanElement>, "value">`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Color \| string \| null` | — | The color to display. Independent of the root's value. |
| `checkerSize` | `number` | `16` | The checkerboard square size, in pixels. |
| `alpha` | `boolean` | `false` | When true, reflects the color's alpha; when false, paints it opaque. |
| `disabled` | `boolean` | `false` | Marks the swatch as non-interactive. Sets `data-disabled`; the swatch has no interaction of its own. |
| `aria-label` | `string` | `'Colour swatch'` | Overrides the default label. |
| `class` | `string` | — | Class applied to the rendered element. |
| `child` | `Snippet<[ChildSnippetArgs]>` | — | Replaces the default element; receives the props it would have received. |

The swatch publishes `--urcolor-swatch-color`, `--urcolor-swatch-color-opaque`, `--urcolor-swatch-alpha` and `--urcolor-swatch-checkerboard` as custom properties for callers styling their own overlays. Your own `style` string is appended last, so it wins the cascade.

### Data Attributes

| Attribute | Part | Present when |
|-----------|------|--------------|
| `data-disabled` | Root, Input | The root is disabled. |
| `data-readonly` | Root, Input | The root is read-only. |
| `data-disabled` | Increment, Decrement | The root is disabled or read-only, or the value already sits at that button's bound. |
| `data-disabled` | Swatch | The swatch's own `disabled` prop is set. |
| `data-pressed` | Increment, Decrement | The button is held down. |

## Accessibility

ColorField exposes the input as the single tab stop. The steppers carry `tabindex="-1"` on purpose: everything they do is reachable from the keyboard through the input's own arrow-key map, so they add no keyboard surface a screen reader user has to walk past.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="spinbutton"` | Applied to `ColorField.Input`. |
| `aria-valuenow` | The current value in display units. Absent while the field is empty. |
| `aria-label` | Not generated for the input — supply your own. Defaults to `"Increase"` / `"Decrease"` on the steppers and `"Colour swatch"` on the swatch. |
| `role="img"` | Applied to `ColorField.Swatch`. |
| `disabled` / `readonly` | Native attributes, mirrored onto the input from the root. |

`aria-valuemin` and `aria-valuemax` are not emitted by this package; the range still governs clamping, snapping and the steppers' disabled state.

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Up | Increase by one step |
| Arrow Down | Decrease by one step |
| Page Up | Increase by 10 steps |
| Page Down | Decrease by 10 steps |
| Home | Jump to minimum |
| End | Jump to maximum |
| Enter | Commit the current value |

Every one of those keys commits, so `onValueCommit` fires per press. Blurring the input commits too. Typing fires `onValueChange` on each keystroke that parses, and the text you typed is only clamped, snapped and reformatted at commit time.

# ColorSwatchGroup

A group of color swatches sharing one selection and one arrow-key navigation surface.

## Preview

```svelte
<script lang="ts">
  import { ColorSwatch, ColorSwatchGroup } from "@urcolor/svelte";

  const colors = [
    "hsl(210, 80%, 50%)",
    "hsl(350, 90%, 60%)",
    "hsl(120, 60%, 45%)",
    "hsl(45, 100%, 55%)",
  ];

  let selected = $state<string[]>([colors[0]!]);
</script>

<ColorSwatchGroup.Root
  bind:value={selected}
  type="single"
  class="flex items-center gap-2"
>
  {#each colors as color (color)}
    <ColorSwatch
      value={color}
      aria-label={color}
      pressed={selected.includes(color)}
      onPressedChange={() => (selected = [color])}
      class="size-10 cursor-pointer rounded-lg outline-none"
    />
  {/each}
</ColorSwatchGroup.Root>
```

::: info Different names, same family
Svelte, React and Angular all call this `ColorSwatchGroup`. Vue ships the same
idea as `ColorSwatchPicker`, built on a listbox, with dedicated
`ColorSwatchPickerItem`, `ColorSwatchPickerItemSwatch` and
`ColorSwatchPickerItemIndicator` parts and a `v-model` that is a single string
until you set `multiple`. Here `value` is always a `string[]`, in both selection
modes, and the ordinary `ColorSwatch` is the item.
:::

Selection is keyed by the **serialized color string**, never by `Color` identity.
`Color` is immutable, so two equal colors are still two different objects and
reference equality would never match — `value`, `isSelected()` and `toggle()`
therefore all speak in `string`.

`value` is `$bindable`, so a plain `bind:value={selected}` over a `$state` array
is all you need. The getter/setter form used elsewhere in these docs
(`bind:value={() => state.color, state.setColor}`) is only required when the
state comes from a `useColor` hook, which this family does not use.

## Anatomy

```svelte
<ColorSwatchGroup.Root>
  <ColorSwatch />
  <ColorSwatch />
  <ColorSwatch />
</ColorSwatchGroup.Root>
```

There is no `Item`, `ItemSwatch` or `Indicator` part — the swatch *is* the item.
The root never renders the swatches itself; it finds them in the DOM by shape,
matching `button, [role='button'], [tabindex]`, and skipping anything nested
inside another match. Binding `pressed` (or `onPressedChange`, or `toggle`) is
what turns a `ColorSwatch` from a static `role="img"` sample into the button the
group can find.

## Examples

### Single selection

`type="single"` keeps at most one swatch selected. Because the swatch owns its
own pressed state, the handler is what actually writes the selection.

```svelte
<ColorSwatchGroup.Root bind:value={selected} type="single" class="flex gap-2">
  {#each colors as color (color)}
    <ColorSwatch
      value={color}
      aria-label={color}
      pressed={selected.includes(color)}
      onPressedChange={() => (selected = [color])}
      class="size-10 rounded-lg"
    />
  {/each}
</ColorSwatchGroup.Root>
```

### Multiple selection

`type="multiple"` alone does not make a multi-select picker work — the handler
has to add and remove too.

```svelte
<ColorSwatchGroup.Root bind:value={selected} type="multiple" class="flex gap-2">
  {#each colors as color (color)}
    <ColorSwatch
      value={color}
      aria-label={color}
      pressed={selected.includes(color)}
      onPressedChange={pressed =>
        (selected = pressed
          ? [...selected, color]
          : selected.filter(entry => entry !== color))}
      class="size-10 rounded-lg"
    />
  {/each}
</ColorSwatchGroup.Root>
```

### Selected indicator

There is no indicator part. Render your own marker in the swatch's children
against the selection state.

```svelte
<ColorSwatch value={color} pressed={selected.includes(color)} class="grid place-items-center">
  {#if selected.includes(color)}
    <svg class="size-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  {/if}
</ColorSwatch>
```

### Vertical orientation

`orientation` decides which arrow keys move focus, and is reflected as
`data-orientation` on the root.

```svelte
<ColorSwatchGroup.Root
  bind:value={selected}
  orientation="vertical"
  class="flex flex-col gap-2"
>
  <!-- swatches -->
</ColorSwatchGroup.Root>
```

### Disabled

`disabled` on the root refuses both `toggle()` and arrow-key navigation, and sets
`data-disabled`. It is not forwarded to the swatches — disable those
individually, which is what removes their `tabindex`.

```svelte
<ColorSwatchGroup.Root bind:value={selected} disabled class="flex gap-2">
  <ColorSwatch value="hsl(210, 80%, 50%)" toggle disabled class="size-10 rounded-lg" />
</ColorSwatchGroup.Root>
```

### Listening to changes

`onValueChange` fires alongside the binding and hands you the whole selection
array. There is no commit event — a selection has no drag to release.

```svelte
<ColorSwatchGroup.Root
  bind:value={selected}
  onValueChange={value => console.log("selected:", value)}
>
  <!-- swatches -->
</ColorSwatchGroup.Root>
```

### Render delegation

Every part accepts a `child` snippet that replaces the element it would have
rendered. The snippet receives the props the part built, including its behaviour
attachment, so spreading them is what keeps the part working.

```svelte
<ColorSwatchGroup.Root bind:value={selected}>
  {#snippet child({ props })}
    <fieldset {...props}>
      <ColorSwatch value="hsl(210, 80%, 50%)" toggle>
        {#snippet child({ props })}
          <button {...props}></button>
        {/snippet}
      </ColorSwatch>
    </fieldset>
  {/snippet}
</ColorSwatchGroup.Root>
```

## API Reference

`Root` is the only member of the `ColorSwatchGroup.*` namespace, and is also
exported unnamespaced as `ColorSwatchGroupRoot`. Items are ordinary `ColorSwatch`
components, imported from the same package. The root's context is readable with
`colorSwatchGroupContext.get()`, or with `tryGetColorSwatchGroupContext()` when
the caller must stay valid outside a group.

### ColorSwatchGroup.Root

The group container. Owns the selection array and the arrow-key navigation for
every swatch inside it. Renders a `<div>` with `role="group"`.

Extends `HTMLAttributes<HTMLDivElement>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `'single' \| 'multiple'` | `'single'` | Whether `toggle()` keeps at most one value or any number of them. |
| `value` | `string[]` | — | The selected item values. Bindable with `bind:value`. |
| `defaultValue` | `string[]` | `[]` | The selection used until the first interaction when `value` is not bound. |
| `disabled` | `boolean` | `false` | Refuses `toggle()` and arrow-key navigation for the whole group. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | The axis arrow-key navigation runs along. |
| `dir` | `'ltr' \| 'rtl'` | — | Reading direction, set on the element and used for navigation, where it falls back to `'ltr'`. Mirrors horizontal arrows only. |
| `loopFocus` | `boolean` | `true` | Whether arrow navigation wraps past the first and last swatch. |
| `onValueChange` | `(value: string[]) => void` | — | Called whenever the selection changes. |
| `class` | `string` | — | Class applied to the rendered element. |
| `child` | `Snippet<[ChildSnippetArgs]>` | — | Replaces the default element; receives the props it would have received. |

A `role` passed by the caller wins over the default `role="group"`.

### Group context

`colorSwatchGroupContext.get()` returns the object below, which is how you build
your own item part. Every value member is a getter over a `$derived`, so read it
from the object rather than destructuring.

| Member | Type | Description |
|--------|------|-------------|
| `type` | `SelectionType` | Single- or multiple-selection semantics. |
| `value` | `readonly string[]` | The currently selected item values. |
| `disabled` | `boolean` | True when the whole group rejects interaction. |
| `orientation` | `'horizontal' \| 'vertical'` | The navigation axis. |
| `loopFocus` | `boolean` | Whether arrow navigation wraps past the ends. |
| `activeIndex` | `number` | Index of the item owning the group's tab stop. |
| `count` | `number` | Number of registered items. |
| `groupState` | `ToggleGroupState` | Ready for `rovingIndexFromKey` / `rovingTabIndex`. |
| `isSelected(itemValue)` | `(value: string) => boolean` | True when the value is part of the selection. |
| `toggle(itemValue)` | `(value: string) => void` | Flips a value, honouring `type`. No-op while disabled. |
| `setActiveIndex(index)` | `(index: number) => void` | Moves the group's tab stop. |
| `tabIndexFor(index)` | `(index: number) => 0 \| -1` | The tabindex for the item at `index`. |
| `register()` | `() => ColorSwatchGroupItemHandle` | Claims a seat; the caller must `dispose()` it on destroy. |

`ColorSwatchGroupItemHandle` exposes `index`, `tabIndex`, `active`, `activate()`
and `dispose()`, each recomputed live from registration order.

### ColorSwatch

The group's item, exported from `@urcolor/svelte` in its own right. These are the
props that matter inside a group; see the ColorSwatch page for the full API.

Extends `HTMLAttributes<HTMLElement>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Color \| string \| null` | — | The color to paint. Use the same string you put in the group's `value` array. |
| `toggle` | `boolean` | Inferred | Forces button behaviour on or off. Left unset, it is true when `pressed` or `onPressedChange` was supplied at initialisation. |
| `pressed` | `boolean` | `false` | Whether the swatch is selected. Bindable with `bind:pressed`. |
| `onPressedChange` | `(pressed: boolean) => void` | — | Called whenever the pressed state flips. |
| `disabled` | `boolean` | `false` | Refuses activation and removes the swatch's `tabindex`. |
| `checkerSize` | `number` | `16` | The transparency grid's tile size, in pixels. |
| `alpha` | `boolean` | `false` | When true, reflects the color's alpha; otherwise it paints fully opaque. |
| `class` | `string` | — | Class applied to the rendered element. |
| `child` | `Snippet<[ChildSnippetArgs]>` | — | Replaces the default element; receives the props it would have received. |

A toggle swatch renders a `<button type="button">`.
A static one renders a `<div role="img">`.
There is no `Checkerboard` part in this package — the swatch paints the
transparency grid itself, under the color.

### CSS Variables

Every swatch emits all four, even for an absent or unparseable value, so styling
never has to guard for a missing variable.

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

### Data Attributes

| Attribute | Part | Present when |
|-----------|------|--------------|
| `data-orientation` | Root | Always; `'horizontal'` or `'vertical'`. |
| `data-disabled` | Root, ColorSwatch | That element is disabled. |
| `data-pressed` | ColorSwatch | A toggle swatch is selected. |

There is no `data-state` and no `data-highlighted` here — those are the Vue
listbox's attributes. Style against `data-pressed` instead.

## Accessibility

The root is a plain `role="group"`, not a listbox, and the swatches inside it are
toggle buttons. Keyboard navigation lives on the root: `keydown` and `focusin`
bubble up from the focused swatch, so a `ColorSwatch` needs no coupling to the
group and stays usable standalone.

### ARIA Labels

| Attribute | Description |
|-----------|-------------|
| `role="group"` | Applied to the root, unless the caller passes their own `role`. |
| `role="img"` | Applied to a static, non-toggle swatch. |
| `aria-pressed` | Applied to a toggle swatch, reflecting its pressed state. |
| `aria-disabled` | Applied to a swatch when its `disabled` prop is set. |
| `aria-label` | **Not generated.** Pass your own on each swatch — a colored button has no text content to name it. |

::: warning Every toggle swatch is its own tab stop
The group computes a roving tab stop — `activeIndex`, `tabIndexFor(index)` and
`register()` are all public — but `ColorSwatch` does not consume it. A toggle
swatch always renders `tabindex="0"`, and none at all when disabled, so out of
the box Tab steps through every swatch and the arrow keys move focus on top of
that. For a true single tab stop, read `tabIndexFor` from the context and apply
it yourself through the swatch's `child` snippet.
:::

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Right / Arrow Left | Move focus between swatches (horizontal orientation) |
| Arrow Down / Arrow Up | Move focus between swatches (vertical orientation) |
| Home | Focus the first swatch |
| End | Focus the last swatch |
| Space / Enter | Toggle the focused swatch |

Arrow navigation wraps at the ends while `loopFocus` is true, and clamps when it
is false. In `rtl`, only the horizontal arrows are mirrored. `Home` and `End`
work in both orientations. There is no typeahead and no `Ctrl/Cmd + A` — those
belong to Vue's listbox-based picker.

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## [2.0.0] - 2026-08-03

### Added

- **`ColorAreaArea`, a new required wrapper inside `ColorAreaRoot`.** The
  pointer/keyboard interaction surface that used to live on `ColorAreaRoot`
  itself now lives here instead. **A picker assembled without it renders
  correctly — the gradient, checkerboard, and thumb all show up — but silently
  ignores every pointer and key press**, because nothing is listening for
  them. See `### Migration` below before upgrading any `ColorArea` usage.
- `ColorSwatchPickerRoot`, `ColorSwatchPickerItem`, `ColorSwatchPickerItemSwatch`,
  and `ColorSwatchPickerItemIndicator` — a swatch picker built on reka's
  `Listbox`, replacing `ColorSwatchGroup` (see `### Removed`).
- `ColorSliderRoot` gained `as`, `asChild`, `defaultValue`, `step`, `name`, and
  `required` props.
- `ColorFieldRoot` gained `placeholder`, `disableWheelChange`, `locale`, and
  `defaultValue` props.
- `ColorSwatchRoot` gained a `label` prop for overriding its accessible name.

### Changed

- **BREAKING:** Depends on `@urcolor/shared` in place of `@urcolor/primitives`,
  and now requires `@urcolor/core ^2.0.0`.
- **BREAKING:** `Color` now comes from `@urcolor/core`'s vendored, zero-dependency
  CSS Color 4 library instead of `internationalized-color`. `color-space` prop
  values (and any other space id passed to a component) use CSS Color 4 ids —
  `rgb` → `srgb`, `p3` → `display-p3`, `a98` → `a98-rgb`, `prophoto` →
  `prophoto-rgb`. See the migration table in
  [`packages/core/CHANGELOG.md`](../core/CHANGELOG.md) for the full `Color` API
  changes (`.set()` → `.with()`/`.withAlpha()`, `.mode` → `.space`,
  `Color.parse()` returning `null` instead of `undefined`, etc.).
- **BREAKING:** `ColorAreaRoot`'s interaction surface is split out into
  `ColorAreaArea` (see `### Added` above and `### Migration` below).
- **BREAKING:** Channel props are renamed for consistency across components:
  - `ColorAreaRoot`: `channelX`/`channelY` → `xChannel`/`yChannel`
  - `ColorTriangleRoot`: `channelX`/`channelY`/`channelZ` →
    `xChannel`/`yChannel`/`zChannel`
  - `ColorWheelRoot`: `channelAngle`/`channelRadius` →
    `angleChannel`/`radiusChannel`
- **BREAKING:** `ColorFieldRoot`'s `readOnly` prop is renamed to `readonly`.
- **BREAKING:** Every root's `valueCommit` emit is replaced by four events —
  `update:modelValue`, `update:color`, `change`, and `changeEnd` — across
  `ColorAreaRoot`, `ColorSliderRoot`, `ColorRingRoot`, `ColorWheelRoot`,
  `ColorTriangleRoot`, and `ColorFieldRoot`. `change` fires on every value
  change (including mid-drag); `changeEnd` fires once an interaction settles,
  replacing `valueCommit`.

`@urcolor/react` deliberately remains on the pre-existing API described above
and does not receive this release's changes — its component and prop names
now diverge from `@urcolor/vue`.

### Removed

- **BREAKING:** `ColorSwatchGroupRoot` and `ColorSwatchGroupItem` are removed.
  Use `ColorSwatchPickerRoot`/`ColorSwatchPickerItem`/
  `ColorSwatchPickerItemSwatch`/`ColorSwatchPickerItemIndicator` instead
  (built on reka's `Listbox`). `type: "single" | "multiple"` is replaced by a
  `multiple` boolean; `rovingFocus` and `loop` no longer exist. `Listbox`
  does roving focus unconditionally, so `rovingFocus` has no replacement and
  needs no migration. It has no looping of any kind, however: arrow
  navigation stops at the first and last swatch instead of wrapping, and
  there is no prop to restore the old `loop` behaviour.
- **BREAKING:** `ColorWheelThumbX`/`ColorWheelThumbY` and
  `ColorTriangleThumbX`/`ColorTriangleThumbY`/`ColorTriangleThumbZ` are
  removed. The parent `ColorWheelThumb`/`ColorTriangleThumb` is now the
  slider itself: a single focusable thumb that announces every channel
  through `aria-valuetext`.

### Fixed

- Every interactive thumb now announces an accessible name: `ColorSwatchRoot`
  (via the new `label` prop, falling back to the resolved color string), the
  `ColorSlider`/`ColorRing`/`ColorWheel`/`ColorTriangle` thumbs (channel
  label(s) via `aria-label`), and `ColorAreaThumb` (both channel labels,
  where it previously had no accessible name at all — its label came from a
  multi-thumb helper that returns nothing for a single-thumb widget).
- `ColorFieldInput`'s `role="spinbutton"` now announces real `aria-valuemin`/
  `aria-valuemax` values instead of hard-coded `undefined`.

### Migration

Prop renames — old prop, new prop, per component:

| Component | Old prop(s) | New prop(s) |
| --- | --- | --- |
| `ColorAreaRoot` | `channelX`, `channelY` | `xChannel`, `yChannel` |
| `ColorTriangleRoot` | `channelX`, `channelY`, `channelZ` | `xChannel`, `yChannel`, `zChannel` |
| `ColorWheelRoot` | `channelAngle`, `channelRadius` | `angleChannel`, `radiusChannel` |
| `ColorFieldRoot` | `readOnly` | `readonly` |

```vue
<!-- Before -->
<ColorAreaRoot v-model="color" channel-x="s" channel-y="l" @value-commit="onCommit" />

<!-- After -->
<ColorAreaRoot v-model="color" x-channel="s" y-channel="l" @change-end="onCommit" />
```

`ColorAreaArea` — required wrapper around the interaction surface:

```vue
<!-- Before: ColorAreaRoot itself handled pointer/keyboard input -->
<ColorAreaRoot v-model="color">
  <ColorAreaGradient />
  <ColorAreaThumb />
</ColorAreaRoot>

<!-- After: pointer/keyboard input now lives on ColorAreaArea. -->
<!-- Omitting this wrapper still renders the picker — it just never responds -->
<!-- to a click, drag, or key press. -->
<ColorAreaRoot v-model="color">
  <ColorAreaArea>
    <ColorAreaGradient />
    <ColorAreaThumb />
  </ColorAreaArea>
</ColorAreaRoot>
```

`ColorSwatchGroup` → `ColorSwatchPicker`:

```vue
<!-- Before -->
<ColorSwatchGroupRoot v-model="selected" type="multiple" roving-focus loop>
  <ColorSwatchGroupItem v-for="c in colors" :key="c" :value="c">
    <ColorSwatch :model-value="c" />
  </ColorSwatchGroupItem>
</ColorSwatchGroupRoot>

<!-- After -->
<ColorSwatchPickerRoot v-model="selected" multiple>
  <ColorSwatchPickerItem v-for="c in colors" :key="c" :value="c">
    <ColorSwatchPickerItemSwatch />
    <ColorSwatchPickerItemIndicator />
  </ColorSwatchPickerItem>
</ColorSwatchPickerRoot>
```

`ColorWheelThumbX`/`ColorWheelThumbY` and
`ColorTriangleThumbX`/`ColorTriangleThumbY`/`ColorTriangleThumbZ` → the
single parent thumb:

```vue
<!-- Before -->
<ColorWheelThumbX />
<ColorWheelThumbY />

<!-- After: one thumb announces both channels via aria-valuetext -->
<ColorWheelThumb />
```

## [0.0.4] - 2026-02-27

- Bumped version of `internationalized-color` to `1.1.1`

## [0.0.2] - 2026-02-26

### Added

- `ColorRing`, `ColorWheel`, and `ColorTriangle` components
- Inner radius property for `ColorRing` components
- Dragging state management in `ColorArea` for improved rendering performance during interactions
- `useColor` composable for color state management
- New color space utilities and restructured color composables

### Fixed

- Resolve `workspace:*` dependency on `@urcolor/core` during publish so the package is installable outside the monorepo
- Enhanced drag handling in `ColorWheel` and `ColorTriangle` components

## [0.0.1] - 2026-02-16

### Added

- Initial release
- `ColorArea` component for 2D color selection
- `ColorSlider` component for single-channel color adjustment
- `ColorSwatch` component for color display
- `ColorSwatchGroup` component for color palette selection

# Vue package: reka-ui parity, single-thumb a11y, shared extraction

Date: 2026-07-19
Scope: `packages/vue` (src, test, stories) + `docs`. `packages/react` explicitly out of scope.

## Goal

Bring `@urcolor/vue` in line with the color-picker components in the reka-ui source tree
(`/Users/grandmagus/Documents/Projects/reka-ui/packages/core/src/{ColorArea,ColorField,ColorSlider,ColorSwatch,ColorSwatchPicker,SliderArea}`),
collapse per-channel thumb elements into a single focusable thumb that describes every
channel, add missing props and events, and extract the duplication the current
implementation carries.

This is a breaking change. Target branch is `release/v1`; no deprecated aliases are kept.

## Non-goals

- Mirroring the change in `packages/react`. The two packages diverge until that is done separately.
- Adopting reka's `ColorChannel` string union. See "Channel vocabulary" below.
- Any refactor not serving the three goals above.

---

## 1. API parity

### Channel vocabulary

reka types channels as `ColorChannel = 'red'|'green'|'blue'|'hue'|'saturation'|'lightness'|'brightness'|'alpha'`,
which only spans rgb / hsl / hsb. urcolor supports 14 spaces including oklch, lab, p3 and
rec2020, keyed `'h'`, `'s'`, `'l'`, `'c'` and so on via `packages/core/src/color-spaces.ts`.

**Decision:** parity applies to prop and event *names*, not to channel value enums. urcolor
keeps its `SpaceId` + channel-key model. Where reka calls `getChannelName(channel)`, urcolor
reads the `label` field already present on each channel config (`"Hue"`, `"Saturation"`,
`"Lightness"`). This gives identical announced strings without narrowing the space list.

### Renames

| Component | Before | After |
|---|---|---|
| `ColorAreaRoot` | `channelX` / `channelY` | `xChannel` / `yChannel` |
| `ColorWheelRoot` | `channelAngle` / `channelRadius` | `angleChannel` / `radiusChannel` |
| `ColorTriangleRoot` | `channelX` / `channelY` / `channelZ` | `xChannel` / `yChannel` / `zChannel` |
| `ColorFieldRoot` | `readOnly` | `readonly` |
| all roots | `valueCommit` emit | `changeEnd` emit |

`ColorRingRoot` already uses `channel`, matching `ColorSliderRoot` and reka. Unchanged.

### Emits

Every root emits the same four events:

| Event | Payload | Fires |
|---|---|---|
| `update:modelValue` | `Color \| undefined` | every value set |
| `update:color` | `Color` | every value set |
| `change` | `Color` | every value set |
| `changeEnd` | `Color` | `pointerup` (only if the value actually changed since `pointerdown`), and on every keyboard interaction that changes the value |

**Deviation 1 from reka:** reka's `change` / `changeEnd` carry a hex `string`. urcolor emits
`Color`, because hex is lossy for oklch / p3 / rec2020 values outside sRGB. This makes
`update:color` redundant with `update:modelValue` in payload; it is kept for name parity so
consumers porting from reka find the event they expect.

### New structural component: `ColorAreaArea`

reka splits ColorArea into a state Root and an interaction surface. urcolor adopts the split:

- `ColorAreaRoot` — state, context provider, hidden form inputs. No handlers.
- `ColorAreaArea` — `role="application"`, `aria-roledescription="Color picker"`,
  `style="touch-action: none"`, owns `keydown` / `pointerdown` / `pointermove` / `pointerup`.

This is breaking for consumer templates: gradient, checkerboard and thumb must now sit inside
`<ColorAreaArea>`.

### Props and events added

`ColorSliderRoot`
- extends `PrimitiveProps` (`as`, `asChild`) — currently absent entirely, so the root cannot
  be retagged or used with `asChild`.
- adds `defaultValue`, `step`, `name`, `required`, and a `VisuallyHidden` form input.
- adds slot props `{ modelValue }`, matching every other root.
- context widens to include `disabled`, `min`, `max`, `step`, `isDragging`. `isDragging` lets
  `ColorSliderGradient` skip redraws mid-drag; it is currently the only gradient that repaints
  on every drag frame.

`ColorSliderThumb`
- `aria-label` = channel label.
- `aria-valuetext` = `"64%"` for percentage-format channels, `"210"` otherwise.
- slot props `{ channelName, channelValue }`.

`ColorFieldRoot`
- adds `placeholder`, `disableWheelChange`, `locale`, `defaultValue`.
- root gains `role="group"`.

`ColorFieldInput`
- binds real `aria-valuemin` / `aria-valuemax`. Both are currently hardcoded to `undefined`
  even though the root computes the range — a `role="spinbutton"` with no announced bounds.
- adds `aria-label` fallback (channel label) and `aria-valuetext` (formatted per channel).
- `inputmode="numeric"` for numeric channels, `"text"` in hex mode.
- adds `wheel` handling gated on focus and `disableWheelChange`.
- adds `beforeinput` filtering: rejects characters outside `[\d.-]` and edits producing `NaN`,
  while allowing partial `-`, `.` and `-.`.
- removes the dead `const parsed = ...` in `onBlur`.

`ColorSwatchRoot`
- adds `label` prop, used as `aria-label`, falling back to the resolved color name, then
  `"transparent"`. Today `role="img"` ships with no accessible name at all.
- adds `aria-roledescription="color swatch"`, `data-color-contrast`, `data-no-color`.
- adds slot props `{ color, alpha }`.

`ColorRingThumb`
- `tabindex` becomes `undefined` when disabled. Currently hardcoded `0`, so disabled rings stay
  in the tab order.
- adds `aria-label` (channel label) and `aria-valuetext`.

**Deviation 2 from reka:** reka's `ColorFieldInput` maps `Home` to max and `End` to min, which
inverts the usual convention. urcolor keeps `Home` → min, `End` → max.

### Root DOM cleanups

`aria-disabled` is emitted only when true across all roots. Several currently bind it raw and
render `aria-disabled="false"` on enabled components.

---

## 2. Single thumb per surface

### Current state

| Component | Focusable thumbs | Tab stops | Problem |
|---|---|---|---|
| `ColorArea` | 1 | 1 | Y channel has no `aria-valuenow` and no `aria-valuetext` — invisible to AT |
| `ColorWheel` | 2 (`ThumbX`, `ThumbY`) | 1 (roving) | both absolutely positioned at 100%×100%, fully overlapping |
| `ColorTriangle` 2-ch | 2 | 1 (roving) | same overlap |
| `ColorTriangle` 3-ch | 3 | 3 | three stacked `tabindex=0` elements; pointer hit-test always resolves to the last painted |

### Target

Delete `ColorWheelThumbX.vue`, `ColorWheelThumbY.vue`, `ColorTriangleThumbX.vue`,
`ColorTriangleThumbY.vue`, `ColorTriangleThumbZ.vue`.

`ColorAreaThumb`, `ColorWheelThumb` and `ColorTriangleThumb` each become the single
`role="slider"` element:

```
role                    "slider"
tabindex                0, or undefined when disabled
aria-label              "Hue, Saturation"              joined channel labels
aria-valuemin/max/now   x channel (angle channel for the wheel) only
aria-valuetext          "Hue 210, Saturation 64"       every channel, including Z
aria-roledescription    "Color thumb"
data-disabled           when disabled
```

Keyboard handling stays on the container (`ColorAreaArea` for the area, the root for wheel,
triangle and ring); the thumb only receives focus. The `activeDirection` context field is
removed from `ColorWheelRootContext` and `ColorTriangleRootContext`, along with the
`thumbXElement` / `thumbYElement` / `thumbZElement` refs, replaced by a single `thumbElement`.

`aria-roledescription="2D slider"` is removed from the wheel and triangle *containers*; the
description now sits on the focusable slider, as it does in reka.

**Deviation 3 from reka (triangle keyboard):** the current 2-channel handler drives X with
`ArrowUp` / `ArrowDown` and Y with `ArrowLeft` / `ArrowRight` — inverted relative to
`ColorArea` — and `Home` / `End` duplicate `PageUp` / `PageDown` exactly. After:

| Key | Effect |
|---|---|
| ArrowLeft / ArrowRight | x −/+ step |
| ArrowUp / ArrowDown | y +/− step |
| PageUp / PageDown | z +/− step (3-channel mode only) |
| Home / End | x → min / max |
| Shift + any of the above | ×10 multiplier |

The 3-channel barycentric handler stops using a hardcoded `step = 0.05` and reads each
channel's `step` from its config. Shift multiplier unifies to ×10 across all components; the
triangle currently uses ×4.

---

## 3. Shared extraction

New directory `packages/vue/src/shared/`:

| Module | Replaces |
|---|---|
| `utils.ts` — `clamp`, `snapToStep`, `linearScale`, `convertValueToPercentage`, `roundValue`, `getDecimalCount`, `getThumbInBoundsOffset`, `hasMinStepsBetweenValues`, `PAGE_KEYS`, `ARROW_KEYS`, `cyclicWrap` | `ColorArea/utils.ts` (which other components reach into today), plus 3 local `snap` reimplementations in Triangle/Wheel/Ring roots and the cyclic-wrap math duplicated between Ring and Wheel |
| `useColorChannelModel.ts` — `parseColor`, default value, vModel wiring, the `Math.abs(diff) > 0.001` feedback-loop guard, display↔native conversion, `ALPHA_CONFIG`, hidden form input, and the four emits | 5 copies across Area / Triangle / Wheel / Ring / Slider / Field |
| `usePointerDrag.ts` — rect caching, `setPointerCapture` on target, rAF throttle, `hasPointerCapture` guards, commit-if-changed on release | 3 copies (Triangle / Wheel / Ring) plus ColorArea's un-throttled inline version |
| `useGradientCanvas.ts` — `renderToCanvas`, `applyOverrides`, `useResizeObserver` wiring, `isDragging` gating, WebGL teardown | 4 verbatim copies of `renderToCanvas`, 4 of `applyOverrides`, 4–5 of the lifecycle boilerplate |
| `useFormControl.ts` — one implementation, SSR default `false` | 5 sites; Triangle/Wheel/Ring inline `closest("form")` instead of importing the existing helper, and the two variants disagree on the SSR default |
| `Checkerboard.vue` — `shape: "rect" \| "circle"` | 5 near-identical files |

`ColorArea/utils.ts` becomes a re-export of `shared/utils.ts` or is deleted, depending on what
remains area-specific after the move.

The public checkerboard names (`ColorAreaCheckerboard`, `ColorRingCheckerboard`, …) survive as
thin wrappers over the shared component, so consumer imports do not break for this item.

WebGL `loseContext` teardown runs only on canvases that actually used WebGL. Today every
gradient calls `getContext("webgl")` on unmount, including canvases that only ever used 2D —
which allocates a WebGL context purely to destroy it.

---

## 4. ColorSwatchPicker replaces ColorSwatchGroup

`ColorSwatchGroupRoot.vue` and `ColorSwatchGroupItem.vue` are deleted. The current
implementation hand-rolls `role="group"` + `RovingFocusGroup` + `role="radio"`/`"checkbox"`
items, sets `aria-pressed` alongside `aria-checked` (an invalid combination for those roles),
uses `role="group"` where `radiogroup` is correct for `type="single"`, gives items no
accessible name, and duplicates its entire template across the `rovingFocus` on/off branches.

New components, mirroring reka, built on reka's `Listbox`:

| Component | Built on | Notes |
|---|---|---|
| `ColorSwatchPickerRoot` | `ListboxRoot` + `ListboxContent` | `modelValue` / `defaultValue` as `string \| string[]`, `multiple`, `disabled`, `loop`, `orientation` (default `"horizontal"`), `dir`. Slot props `{ modelValue }`. Emits `ListboxRootEmits`. |
| `ColorSwatchPickerItem` | `ListboxItem` | required `value: string`; `aria-label` = resolved color name, falling back to the raw value; `data-color`; `--urcolor-swatch-picker-item-color` custom property. Provides item context `{ color }`. |
| `ColorSwatchPickerItemSwatch` | `ColorSwatchRoot` | reads color from item context |
| `ColorSwatchPickerItemIndicator` | `ListboxItemIndicator` | |

Roles (`listbox` / `option`), `aria-selected`, roving focus, typeahead, keyboard navigation and
multi-select all come from Listbox rather than being reimplemented.

---

## 5. Testing

Test-driven: each behavior below gets a failing test before the implementation lands.

Per component:
- exactly one element with `role="slider"` per interactive surface
- `aria-label` and `aria-valuetext` content, including the Z channel in 3-channel triangle mode
- `aria-valuemin` / `aria-valuemax` / `aria-valuenow` present and correct
- `tabindex` is `undefined` when disabled, `0` otherwise
- emit ordering: `change` on every set, `changeEnd` exactly once per pointer interaction
- hidden form input names and values (`name`, `xName`, `yName`)
- keyboard maps, including the remapped triangle keys

New suite for `ColorSwatchPicker`: listbox / option roles, single and multiple selection,
`aria-selected` state, item accessible names.

Shared composables get direct unit tests where they carry logic worth pinning independently
(`snapToStep`, `cyclicWrap`, `useColorChannelModel`'s feedback-loop guard).

Existing suites (`ColorArea.test.ts`, `ColorField.test.ts`, `ColorAreaGradient.test.ts`,
`ColorSwatch.test.ts`, `composables.test.ts`) are updated to the new names rather than deleted.

## 6. Docs

- `docs/components/vue/demo/*.vue` and `docs/guide/vue/demo/*.vue` — new prop names, the
  `ColorAreaArea` wrapper, `ColorSwatchPicker` in place of `ColorSwatchGroup`.
- Component reference `.md` prop and event tables, per the structure in `CLAUDE.md`.
- Guide pages that walk through the area, wheel and triangle need their step ordering updated
  for the `ColorAreaArea` wrapper.
- `ColorSwatchGroup` pages become `ColorSwatchPicker` pages; sidebar entries updated in
  `docs/.vitepress/config.ts`.

## Verification

- `bun test` from the repo root
- `bun run lint` (eslint + `vue-tsc --noEmit`)
- `bun run docs:build`

All three must pass before the work is considered complete.

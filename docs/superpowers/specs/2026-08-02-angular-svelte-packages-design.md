# Angular and Svelte Packages

**Date:** 2026-08-02
**Status:** Approved

## Goal

Ship `@urcolor/angular` and `@urcolor/svelte` at full component parity with `@urcolor/react`, extract the framework-agnostic behavior that vue and react currently duplicate into a new `@urcolor/primitives` package, and converge all four packages on a single combined `Thumb` per family.

## Context

The monorepo has two framework packages today:

- `@urcolor/vue` — ~5.2k lines, built on `reka-ui`, `PascalCase/` directories, composables
- `@urcolor/react` — ~4k lines, built on `@base-ui-components/react`, `kebab-case/part/` directories, `*DataAttributes.ts` enums, colocated tests

Their APIs have diverged. Vue has `ColorSwatchPicker`; React has `ColorSwatchGroup`, split `ThumbX`/`ThumbY`/`ThumbZ` parts, and `ColorSliderControl`.

**React is the canonical API** for this work, with one deliberate exception: the 2D/3D thumb model comes from Vue (see [Combined Thumb](#combined-thumb)). React's split thumbs are removed rather than propagated.

Six of the seven React families already hand-roll pointer drag and keyboard handling. Only `ColorSlider` (via `Slider`) and `ColorSwatch`/`ColorSwatchGroup` (via `Toggle`/`ToggleGroup`) depend on base-ui.

Math utilities (`clamp`, `snapToStep`, `linearScale`, `getThumbInBoundsOffset`, `getClosestThumbIndex`, `hasMinStepsBetweenValues`) are copy-pasted verbatim between vue and react. Adding two more frameworks would make that a four-way copy.

## Architecture

```
@urcolor/core         (exists)  color math, gradient sampling, geometry, channel configs
@urcolor/primitives   (NEW)     framework-agnostic behavior — no DOM framework imports
  ├── @urcolor/vue      (migrate to primitives)
  ├── @urcolor/react    (migrate to primitives)
  ├── @urcolor/svelte   (NEW)
  └── @urcolor/angular  (NEW)
```

`@urcolor/primitives` is published — consumers of `@urcolor/svelte` and `@urcolor/angular` need it at runtime. Its only dependency is `@urcolor/core`.

## `@urcolor/primitives`

Plain functions and small state objects. No signals, no runes, no reactivity primitives. Each framework adapter wires it to its own reactivity system.

| Module | Source today | Contents |
|---|---|---|
| `math.ts` | `react/src/utils.ts` + `vue/src/shared/utils.ts` (verbatim copies) | `clamp`, `getDecimalCount`, `roundValue`, `snapToStep`, `linearScale`, `convertValueToPercentage`, `getThumbInBoundsOffset`, `getClosestThumbIndex`, `hasMinStepsBetweenValues` |
| `keys.ts` | both packages | `PAGE_KEYS`, `ARROW_KEYS`, arrow→delta resolution including RTL, inverted, and orientation |
| `slider.ts` | **new** — replaces base-ui `Slider` | 1D value state machine: pointer→value mapping, keyboard stepping, commit-on-release, ARIA attribute computation |
| `toggle.ts` | **new** — replaces base-ui `Toggle`/`ToggleGroup` | pressed state, roving focus for the group. Consumed by Svelte's `ColorSwatch` + `ColorSwatchGroup` and Angular's `ColorSwatch`. Angular's `ColorSwatchGroup` uses `@angular/aria` Listbox instead and does not use the group half. |
| `drag.ts` | `vue/shared/usePointerDrag.ts` + inline logic in 4 react roots | pointer capture, rect→normalized coordinates, 2D clamp callbacks |
| `canvas.ts` | `renderToCanvas`, inlined in every Gradient component of both packages | DPR sizing, `OffscreenCanvas` blit, `CHECKERBOARD_BACKGROUND` constant |
| `channel-model.ts` | `vue/shared/useColorChannelModel.ts` | color↔channel display value round-tripping |
| `labels.ts` | `vue/shared/channel-labels.ts` | ARIA channel labels |
| `data-attributes.ts` | react's 30+ `*DataAttributes.ts` files | single source for `data-*` names across all four packages |

## `@urcolor/svelte`

Svelte 5 runes. Directory layout mirrors React's kebab-case tree so the two remain diffable.

```
packages/svelte/src/
  components/color-slider/
    root/ColorSliderRoot.svelte
    root/context.svelte.ts          # setContext/getContext, $state-backed
    control/ColorSliderControl.svelte
    track/ColorSliderTrack.svelte
    range/ColorSliderRange.svelte
    thumb/ColorSliderThumb.svelte
    gradient/ColorSliderGradient.svelte
    index.ts                        # flat exports
    index.parts.ts                  # export * as ColorSlider
  hooks/useColor.svelte.ts          # runes require .svelte.ts
  index.ts
```

Both export styles are ported, matching React: `<ColorSlider.Root>` and `<ColorSliderRoot>`.

### Props

`value` is `$bindable()`, making `bind:value` the idiomatic path. `defaultValue`, `onValueChange`, and `onValueCommit` are also supported for React-shaped usage. Rest props spread onto the rendered element; `class` and `style` pass through.

### `child` snippet

The `asChild` equivalent:

```svelte
<ColorSlider.Root bind:value colorSpace="oklch" channel="h">
  <ColorSlider.Track>
    <ColorSlider.Gradient />
    <ColorSlider.Thumb />
  </ColorSlider.Track>
</ColorSlider.Root>

<ColorSlider.Thumb>
  {#snippet child({ props })}
    <button {...props} class="my-thumb" />
  {/snippet}
</ColorSlider.Thumb>
```

### Hooks

`.svelte.ts` rune modules returning objects with getters and setters over `$state`.

### Build

`@sveltejs/package`. Ships `.svelte` source plus generated `.d.ts` under the `svelte` export condition, so the consumer's own Svelte compiler handles compilation. Peer dependency: `svelte: ^5`.

## `@urcolor/angular`

Angular v21+ (v22 current), standalone, signals, zoneless. Attribute directives — the consumer owns every element and tag, which is the closest Angular analogue to `render`/`as`.

```
packages/angular/src/
  components/color-slider/
    root/color-slider-root.ts          # @Directive({ selector: '[urcColorSliderRoot]' })
    track/color-slider-track.ts
    thumb/color-slider-thumb.ts
    gradient/color-slider-gradient.ts  # selector: 'canvas[urcColorSliderGradient]'
    index.ts
  services/                            # injectable, signal-backed (React's hooks)
  index.ts
```

Context flows through DI — child directives call `inject(ColorSliderRoot)` rather than reading a context object.

### Props: React → Angular natives

The Angular API does **not** mirror React prop-for-prop. It uses Angular and DOM natives instead.

| React | Angular |
|---|---|
| `value` / `defaultValue` / `onValueChange` | `model<Color>()` → `[(value)]` |
| `onValueCommit` | `output<Color>()` → `(valueCommit)` |
| `disabled` | native `disabled` attribute, host-bound `aria-disabled` |
| `dir` | ambient `Directionality`, not a prop |
| `orientation` | `input()`, host-bound `aria-orientation` |
| `className` / `style` | consumer's own element — nothing to pass |
| — | `ControlValueAccessor` on Root and Field, so `formControlName` and `ngModel` work |

The `*DataAttributes.ts` enums become `host: { '[attr.data-disabled]': ... }` bindings, with names sourced from `@urcolor/primitives/data-attributes`.

### `@angular/aria`

`@angular/aria` provides Autocomplete, Listbox, Select, Multiselect, Combobox, Menu, Menubar, Toolbar, Accordion, Tabs, Tree, and Grid. It has **no Slider and no Toggle/ToggleGroup**.

Used only where a pattern exists:

- `ColorSwatchGroup` → `Listbox` (roving focus, typeahead, multi-select)
- Everything else → `@urcolor/primitives`

### Usage

```html
<div urcColorSliderRoot [(value)]="color" colorSpace="oklch" channel="h">
  <div urcColorSliderTrack>
    <canvas urcColorSliderGradient></canvas>
    <div urcColorSliderThumb></div>
  </div>
</div>
```

### Build

`ng-packagr`, producing Angular Package Format. This is the one place the monorepo gains a non-Bun/Vite toolchain — decorators require `ngtsc`. Peer dependencies: `@angular/core`, `@angular/common`, `@angular/forms`, `@angular/aria`, all `^21 || ^22`.

## Parity matrix

Angular and Svelte each ship all seven families. The `Checkerboard` parts are **not** ported — they are already deprecated (`warnCheckerboardDeprecated`), and Gradient paints the checkerboard itself.

| Family | Parts |
|---|---|
| ColorArea | Root, Gradient, Thumb |
| ColorField | Root, Input, Increment, Decrement, Swatch |
| ColorRing | Root, Track, Gradient, Thumb |
| ColorSlider | Root, Control, Track, Range, Thumb, Gradient |
| ColorSwatch | single `ColorSwatch` component (no Root sub-part) |
| ColorSwatchGroup | Root |
| ColorTriangle | Root, Gradient, Thumb |
| ColorWheel | Root, Gradient, Thumb |

Plus 14 hooks (Svelte) / services (Angular), matching React's public export list: `useColor`, `useColorSpace`, `useRGB`, `useHSL`, `useHSV`, `useHWB`, `useOKLCh`, `useOKLab`, `useLCh`, `useLab`, `useP3`, `useA98`, `useProPhoto`, `useRec2020`.

## Combined Thumb

React and Vue currently model 2D/3D thumbs differently:

- **React** — `Thumb` is a visual positioner with no role and no focus. `ThumbX`/`ThumbY`/`ThumbZ` are invisible full-size overlays, each `role="slider"` with roving `tabIndex` driven by `ctx.activeDirection` and a per-axis `aria-valuenow`.
- **Vue** — one `Thumb` is both positioner and control: `role="slider"`, `tabindex=0`, combined `aria-label` (`"Hue, Saturation"`) and combined `aria-valuetext` (`"Hue 210, Saturation 80%"`).

**All four packages converge on Vue's model.** A single `Thumb` per family, carrying position, `role="slider"`, focus, and combined ARIA. The root resolves arrow-key direction rather than a focused per-axis element.

### Accessibility tradeoff

The split exists so a screen reader receives a discrete value per axis and arrow keys map to whichever axis holds focus. Merging puts every axis into one `aria-valuetext`, and `aria-valuenow` reports the primary axis only. This is the behavior `@urcolor/vue` already ships and is a legitimate reading of the 2D-slider pattern — recorded here as a deliberate choice, not an oversight.

### React breaking change

`@urcolor/react` is at `0.0.1`, so this lands as a straight removal rather than a deprecation cycle.

Deleted — 5 components, with their colocated tests and `*DataAttributes.ts` files:

- `color-wheel/thumb-x/`, `color-wheel/thumb-y/`
- `color-triangle/thumb-x/`, `color-triangle/thumb-y/`, `color-triangle/thumb-z/`

Rewritten:

- `ColorWheelThumb` and `ColorTriangleThumb` absorb `role="slider"`, `tabIndex`, combined `aria-label`/`aria-valuetext`, and element registration
- `ColorWheelRoot` + `ColorWheelRootContext` and `ColorTriangleRoot` + `ColorTriangleRootContext` drop `activeDirection`, `setActiveDirection`, and the `thumbXElement`/`thumbYElement`/`thumbZElement` refs; keyboard handling moves to the root
- `index.ts` and `index.parts.ts` for both families

Unaffected: `ColorArea` and `ColorRing` already ship a single `Thumb`. `@urcolor/vue` needs no change — it is already the target model.

## Vue and React migration

The `@urcolor/primitives` extraction is deletion, not rewrite. Both packages keep their current dependencies and behavior. (The Thumb merge above is a separate, genuine rewrite, scoped to React's wheel and triangle.)

- `react/src/utils.ts` and the math half of `vue/src/shared/utils.ts` become re-exports from `@urcolor/primitives`. Same names, same signatures — no call sites change.
- `renderToCanvas`, duplicated across roughly eight Gradient components in each package, moves to `primitives/canvas.ts`.
- `vue/shared/usePointerDrag.ts` and the inline pointer logic in React's four hand-rolled roots become thin adapters over `primitives/drag.ts`.
- **React keeps base-ui `Slider`/`Toggle`. Vue keeps reka-ui.** The new `primitives/slider.ts` serves Angular and Svelte only.

### Accepted consequence

For at least one release cycle, slider keyboard and RTL behavior comes from three different implementations: base-ui in React, reka-ui in Vue, `@urcolor/primitives` in Angular and Svelte. Edge-case behavior will differ between them. Converging React and Vue onto `primitives/slider.ts` is deliberate follow-up work, outside this spec.

### Verification bar

The existing vue and react suites (`bun test`) pass unchanged. No new tests are written for those packages. If a test requires editing to pass, that is a regression in the migration, not a test that needs updating.

**One carve-out:** the Thumb merge legitimately changes React's wheel and triangle test files. Those 5 `Thumb{X,Y,Z}.test.tsx` files are deleted, and `ColorWheelThumb.test.tsx` / `ColorTriangleThumb.test.tsx` gain the role, focus, and ARIA assertions the deleted files carried. Root tests covering `activeDirection` move to keyboard-through-the-root assertions. No other React or Vue test file may change.

## Monorepo wiring

- Root `build` script gains ordering: `core → primitives → relative → i18n → vue → react → svelte → angular`
- `workspaces: ["packages/*"]` already picks up new directories — no change needed
- ESLint: add an `eslint-plugin-svelte` + `svelte-eslint-parser` block for `**/*.svelte`. Angular is plain `.ts` and the existing config covers it; `@angular-eslint` is deferred
- Root `lint` becomes `eslint . && vue-tsc --noEmit && svelte-check`. Angular type-checks through its own `tsc -p`
- `docs:build` is unchanged

## Risks

1. **`primitives/slider.ts` is genuinely new code.** base-ui's Slider handles RTL, inverted, orientation, page-step, and commit semantics. Reimplementing it is the single largest source of behavior bugs in this work, and Angular/Svelte have no test suite (out of scope) to catch them.
2. **`ng-packagr` in a Bun monorepo.** First non-Bun toolchain in this repo. Whether `bun install` and `workspace:*` links resolve cleanly for it is unknown until attempted.
3. **`@angular/aria` is new**, marked "New" in the v22 docs. The Listbox API may shift.
4. **`renderToCanvas` uses `OffscreenCanvas`** with no SSR guard today. Angular and SvelteKit both SSR by default, so the new packages need `typeof window` guards that React and Vue never needed.
5. **The Thumb merge moves keyboard handling into the root** for React's wheel and triangle, replacing `activeDirection`. Vue already has the working shape to copy: `ArrowLeft`/`ArrowRight` → x (angle), `ArrowUp`/`ArrowDown` → y (radius), `shiftKey` → 10× step. The triangle needs no third-axis key even in three-channel mode — `z` falls out of barycentric normalization from x and y. Low risk, but it is React behavior being replaced rather than added.

## Out of scope

- Tests for `@urcolor/angular` and `@urcolor/svelte`
- Storybook for the new packages
- Docs site pages (`docs/components/angular`, `docs/components/svelte`)
- Migrating React and Vue onto `primitives/slider.ts`
- `@angular-eslint`
- Porting the deprecated `Checkerboard` parts
- Renaming Vue's `ColorSwatchPicker` to `ColorSwatchGroup`, or any other Vue/React API convergence beyond the Thumb merge

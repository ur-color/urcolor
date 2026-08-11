# Five framework packages: Preact, Solid, Lit, Alpine, Ember

Add `@urcolor/preact`, `@urcolor/solid`, `@urcolor/lit`, `@urcolor/alpine` and
`@urcolor/ember` at full parity with the existing Vue, React, Svelte and Angular
packages: all 8 components, all 30 parts, all 14 colour hooks.

## Foundation

`@urcolor/shared` already carries every framework-agnostic piece the ports need:
`createDragController`, `valueFromKey`, `valueFromPosition`, `positionFromValue`,
`resolveChannelConfig`, `colorToDisplayValue`, `applyDisplayValue`, the `DATA_*`
attribute names, the gradient and CSS-gradient recipes, and the canvas helpers.
Svelte and Angular consume it with no UI dependency at all, and their component
trees are the reference shape for every new port. No new logic lands in `shared`
unless a port finds a genuine gap; if one does, it lands in `shared` rather than
in the port.

Props, data-attributes and keyboard behaviour are therefore identical across
packages by construction, not by discipline.

## Step 0: remove base-ui from React

React is not dependency-free today. It builds on `@base-ui-components/react`
across 7 files:

| File | Import |
| --- | --- |
| `color-slider/root/ColorSliderRoot.tsx` | `Slider.Root` |
| `color-slider/control/ColorSliderControl.tsx` | `Slider.Control` |
| `color-slider/track/ColorSliderTrack.tsx` | `Slider.Track` |
| `color-slider/range/ColorSliderRange.tsx` | `Slider.Indicator` |
| `color-slider/thumb/ColorSliderThumb.tsx` | `Slider.Thumb` |
| `color-swatch/ColorSwatch.tsx` | `Toggle` |
| `color-swatch-group/root/ColorSwatchGroupRoot.tsx` | `ToggleGroup` |

Add `packages/react/src/primitives/` holding `Slider` (Root, Control, Track,
Indicator, Thumb), `Toggle` and `ToggleGroup`, built on `@urcolor/shared` and
structured after the Svelte slider root. Swap the 7 import sites. Drop the
`@base-ui-components/react` dependency.

React's 33 existing test files are not a safety net: 25 of them assert only
`expect(X).toBeDefined()`. The behaviour tests covering keyboard stepping, thumb
positioning, toggle state and roving focus are written before the primitives
they guard, and the 8 tests that do render must pass unchanged.

Two documented attributes constrain the work. `ColorSwatch` emits
`data-state="on" | "off"` inside a group, documented at
`docs/components/react/color-swatch.md:75`, and it must survive the move. The
`dir` and `inverted` props on `ColorSlider.Root` are currently accepted and
never forwarded to base-ui; the internal primitive honours them, which is a
behaviour fix.

This is a prerequisite, not an optional cleanup: it is what reduces the React
source to core hooks plus `forwardRef`, which is what makes a preact/compat
build of that same tree viable.

## Package matrix

| Package | Source | Runtime deps | Build |
| --- | --- | --- | --- |
| `@urcolor/preact` | compiles `packages/react/src` | core, shared | vite lib mode, `react` / `react-dom` / `react/jsx-runtime` aliased to `preact/compat` |
| `@urcolor/solid` | own tree, Svelte-shaped | core, shared | `vite-plugin-solid`, JSX preserved for downstream compilation |
| `@urcolor/lit` | own tree | core, shared, `lit` | `bun build --format esm` |
| `@urcolor/alpine` | own tree, thin | core, shared, `@urcolor/lit` | `bun build --format esm` |
| `@urcolor/ember` | own tree, `.gts` | core, shared | v2 addon, `@embroider/addon-dev` + rollup |

### Preact is a second build, not a second source

`@urcolor/preact` has no source files of its own beyond an entry point and a
vite config. It compiles `packages/react/src` with a different alias map and
emits its own `dist` and `.d.ts`. One API, one place to fix a bug.

The constraint this imposes: the React source may not use anything
`preact/compat` lacks. After step 0 it imports only core hooks and `forwardRef`,
which compat covers.

### Lit renders into light DOM

Every element overrides `createRenderRoot()` to return `this`. User classes,
Tailwind utilities and inherited custom properties then behave exactly as they
do in the React and Vue packages, which is the contract a headless library owes
its users. Style encapsulation is deliberately given up; this library never
wanted it.

Elements are named `<urcolor-slider-root>`, `<urcolor-slider-track>`,
`<urcolor-slider-thumb>` and so on, 30 in total. Root elements hold state on
`@property` accessors; parts resolve their root with
`closest("urcolor-slider-root")` rather than shipping a context protocol.

Light-DOM rendering has one sharp edge: Lit's `render()` will clear
user-authored children. Root templates must pass light-DOM children through
rather than templating over them.

### Alpine is a plugin, not a component set

`Alpine.plugin(urcolor)` registers the Lit custom elements plus:

- an `x-color` directive binding an Alpine expression to an element's `color`
  property and its `colorchange` event,
- a `$color` magic wrapping `Color` for parsing and conversion in templates.

No second DOM implementation exists for Alpine.

### Ember uses yielded contextual components

Ember has no context API. Parts reach root state by being yielded:

```hbs
<ColorSliderRoot
  @color={{this.color}}
  @onColorChange={{this.setColor}}
  @channel="h"
  as |slider|
>
  <slider.Track>
    <slider.Gradient />
    <slider.Thumb />
  </slider.Track>
</ColorSliderRoot>
```

Authored as a v2 addon in `.gts` template-tag format, so components import
directly and carry full TypeScript types on their args. Octane semantics
(`@tracked`, Glimmer components) throughout. The API shape diverges from the
dot-notation used elsewhere, so Ember's docs carry their own examples.

## Component surface

8 components, 30 parts, identical in every package:

| Component | Parts |
| --- | --- |
| ColorSwatch | (single component) |
| ColorSwatchGroup | Root |
| ColorSlider | Root, Control, Track, Range, Thumb, Gradient, Checkerboard |
| ColorField | Root, Input, Increment, Decrement, Swatch |
| ColorArea | Root, Gradient, Checkerboard, Thumb |
| ColorRing | Root, Track, Gradient, Checkerboard, Thumb |
| ColorWheel | Root, Gradient, Checkerboard, Thumb |
| ColorTriangle | Root, Gradient, Checkerboard, Thumb |

## Idiom mapping

Angular already renamed the hooks to `*Store` services, so idiom-adapted naming
is established precedent rather than a new inconsistency.

| Package | Composition | Colour hooks |
| --- | --- | --- |
| Preact | React source verbatim, dot-notation parts | `useColor`, `useHSL`, … unchanged |
| Solid | `createContext`, props read as getters, `<ColorSlider.Root>` | `createColor`, `createHSL`, … |
| Lit | 30 custom elements, parts find root via `closest()` | reactive controllers, `new ColorController(this, "hsl(…)")` |
| Alpine | `x-color` directive over `<urcolor-*>` elements | `$color` magic |
| Ember | yielded contextual components | `@tracked` classes mirroring Angular: `ColorStore`, `HslStore`, … |

Solid's `Root` takes the same `value` / `defaultValue` / `onValueChange` trio as
every other package rather than a signal tuple, so the controlled and
uncontrolled contracts match.

## Tooling

- Root `build` script gains five entries, ordered after `shared`.
- Root `lint` gains `eslint-plugin-solid` and a `glint --declaration` typecheck
  over the Ember `.gts` tree, alongside the existing `svelte-check` and Angular
  `tsc`.
- Solid tests need a Bun preload plugin compiling JSX through
  `babel-preset-solid`, shaped like the existing Vue SFC plugin in `preload.ts`.

## Testing

8 smoke tests per package, 40 total. Each proves: the root renders, parts wire
to the root, arrow keys step the value, and the expected `data-*` attributes
appear.

Preact, Solid, Lit and Alpine run under happy-dom, using
`@testing-library/preact`, `@solidjs/testing-library`, and plain DOM assertions
for the two custom-element packages.

Ember needs a test app: `packages/ember/test-app` on Embroider + vite with
`@ember/test-helpers` and qunit. That is a real build to stand up for 8 tests,
and it is worth it, because the yielded-component API is the only API here with
no sibling to copy and no other route to verification.

## Documentation

- 40 new code-only pages under `docs/components/{preact,solid,lit,alpine,ember}/`,
  following the Svelte and Angular pattern. No live demos.
- Five component arrays and five sidebar groups in `.vitepress/i18n/nav.ts`.
- `guide/installation.md`: five install blocks × 4 package managers, plus the
  prerequisites line and the package table. Same for `de/`, `es/` and `fr/`.
- `components/index.md`.
- The `multi-framework` home feature string in `.vitepress/i18n/strings.ts`,
  currently "Four frameworks", becomes nine across all 7 locales.

## Build order

1. Step 0: remove base-ui from React.
2. Preact, which validates the alias build.
3. Lit.
4. Alpine, which depends on Lit.
5. Solid.
6. Ember.
7. Documentation sweep, once every API is settled.

## Risks

- **preact/compat gaps** in the React source after step 0. Low: only core hooks
  and `forwardRef` remain.
- **Ember `.gts` + Embroider inside a Bun workspace** is the least-trodden path
  in this plan.
- **Lit light-DOM rendering** clearing user children if a root templates over
  them instead of passing them through.

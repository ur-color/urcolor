# CSS Gradients for SSR

**Date:** 2026-08-11
**Status:** Draft

## Goal

Paint every gradient that has an exact CSS equivalent with stacked CSS gradients instead of a canvas, so a picker renders correctly in server-rendered HTML and on first paint. Keep the canvas only for the gradients that genuinely need per-pixel color conversion: perceptual 2D areas, perceptual wheels, and the triangle.

A plain HSV picker — the common case — ends up with no `<canvas>` element, no WebGL context, and no post-hydration repaint.

## Context

All five gradient components in all four framework packages paint into a `<canvas>`:

| Component | Path today |
| --- | --- |
| `ColorSliderGradient` | WebGL `drawLinearGradient` — 12 stops lerped in sRGB on the GPU |
| `ColorRingGradient` | CPU `sampleConicRing` — 128×128 grid, blitted through `renderToCanvas` |
| `ColorAreaGradient` | WebGL `drawGradient` for corner colors, CPU `sampleBilinearGrid` / `sampleChannelGrid` otherwise |
| `ColorWheelGradient` | CPU `samplePolarGrid` — 128×128 grid |
| `ColorTriangleGradient` | CPU `sampleTriangleGrid` — the most expensive of the five |

None of this runs on a server. `renderToCanvas` returns quietly when `ImageData` is undefined, and the WebGL painters need a real context, so server-rendered markup contains an empty canvas. The gradient appears only after mount, and only after the `ResizeObserver` in `useGradientCanvas` delivers its first callback. In a VitePress or Nuxt page that is a visible flash of the checkerboard background where the picker should be.

The canvas also costs a WebGL context. Browsers cap live contexts at roughly 16 and silently drop the oldest, which is why `useGradientCanvas` carries the `usesWebGL` teardown. A page with several sliders spends that budget on gradients a browser could paint from a style declaration.

The framing that opened this work — "CSS for sRGB spaces, canvas for OkLab" — turns out to be too coarse. Gradient *stops* are computed in JavaScript through `Color`, which runs on a server perfectly well, so stop colors can come from any space. Only the *interpolation between* stops is constrained to what CSS can do. That moves the boundary: a 1D sweep is CSS-able in every space, and a 2D area is CSS-able only when the space's mapping to sRGB happens to factor into layered compositing.

## Architecture

One new module, `packages/shared/src/css-gradient.ts`. Pure functions, no DOM references, no `Color` mutation.

```
@urcolor/shared
  css-gradient.ts       recipe builders → CSS layer descriptors, or null
  gradient.ts           unchanged — WebGL painters and CPU grid samplers
  canvas.ts             unchanged — renderToCanvas, checkerboard
```

### The capability gate

A builder returns `null` when no exact recipe exists for the requested combination. That return value *is* the capability gate. There is no separate table of supported spaces to drift out of sync with the recipes themselves, and adding a recipe later is a change in one place.

```ts
export type GradientRenderer = "auto" | "css" | "canvas";

/**
 * One paint layer. `mask` is set only by the recipes that lerp two gradients
 * across the second axis; everything else leaves it undefined.
 */
export interface CssGradientLayer {
  image: string;
  mask?: string;
}

export interface StopOptions {
  /** Number of stops to emit. Defaults to 36 for cyclic channels, 16 otherwise. */
  steps?: number;
}

export function cssLinearStops(colors: Color[], angleDeg: number): CssGradientLayer[];
export function cssConicStops(colors: Color[], startAngleDeg: number): CssGradientLayer[];
export function cssAreaBilinear(tl: Color, tr: Color, bl: Color, br: Color): CssGradientLayer[];

/** A `null` channel means that axis is alpha, matching the components' own convention. */
export function cssAreaChannels(
  base: Color, space: SpaceId,
  xChannel: string | null, yChannel: string | null,
  slidingFromLeft: boolean, slidingFromTop: boolean,
  options?: StopOptions,
): CssGradientLayer[] | null;

export function cssWheelPolar(
  base: Color, space: SpaceId,
  angleChannel: string, radiusChannel: string,
  startAngleDeg: number, options?: StopOptions,
): CssGradientLayer[] | null;
```

`ColorTriangleGradient` gets no builder. Its barycentric sweep has no CSS equivalent and it stays on the canvas unconditionally.

### Rendering the layers

Layers are ordered bottom-first. A `collapseLayers(layers)` helper merges each run of consecutive mask-free layers into a single comma-joined `background-image` value, reversing the run because CSS paints the first background layer on top. Every recipe except the two mask-carrying ones collapses to a single element.

The framework components render one absolutely-positioned `<span>` per collapsed layer, inset to the root, `pointer-events: none` — the same box the canvas occupied. The checkerboard background stays on the `Primitive` where it already is, and the clip/mask that shapes the ring, wheel and triangle stays on the `Primitive` too, so it cuts the spans exactly as it cut the canvas.

### Color serialization

Every stop is emitted through `serialize(color.toObject(), "srgb")`, which produces `rgb(r g b)` or `rgb(r g b / a)`. Colors are never emitted in their own notation.

This matters for two reasons. Out-of-gamut `oklch()` in a CSS gradient is gamut-mapped by the browser, and browsers do not agree on how; the canvas path clamps to sRGB. Serializing to `rgb()` reproduces the canvas behavior exactly and identically everywhere. It also keeps the output parseable by every browser that supports the gradient syntax itself, with no wide-gamut feature detection.

## Recipes

### Slider — `cssLinearStops`, never null

```
linear-gradient(<angle + 90>deg, <stop0> 0%, …, <stopN> 100%)
```

The component's `angle` is 0 for left-to-right and 90 for top-to-bottom. CSS measures from "to top" clockwise, so left-to-right is `90deg`; the conversion is `angle + 90`.

This is not an approximation. `drawLinearGradient` uploads the same stops and lerps between them in sRGB in the fragment shader; a CSS `linear-gradient` lerps between the same stops in sRGB. Mirroring is already applied at the data level by reversing the stop array, so no CSS-side flag is needed.

### Ring — `cssConicStops`, never null

```
conic-gradient(from <startAngle>deg, <stop0> 0deg, …, <stopN> 360deg)
```

`sampleConicRing` computes `atan2(dx, -dy) - startRad`, which starts at the top and advances clockwise. CSS `conic-gradient(from Xdeg)` uses the same origin and direction, so `startAngle` passes through unchanged.

The ring sweeps one channel, usually hue, and this replaces a 128×128 per-pixel conversion with a declaration.

### Area, corner mode — `cssAreaBilinear`, null only with `interpolationSpace`

```
layer 0:  linear-gradient(to right, <bl>, <br>)
layer 1:  linear-gradient(to right, <tl>, <tr>)
          mask-image: linear-gradient(to top, transparent, #000)
```

Bilinear interpolation is `lerp(bottomRow(x), topRow(x), y)`. The mask ramp makes the top layer's alpha equal to `y`, and source-over compositing of a premultiplied layer at alpha `y` over the bottom layer is exactly that lerp.

With the slider converted too, both WebGL painters — `drawGradient` and `drawLinearGradient` — fall out of the default path. They stay exported from `@urcolor/shared` and stay reachable through `renderer="canvas"`; nothing is removed. The practical effect is that a default picker allocates no WebGL context at all.

Mirroring swaps the corner colors, reusing the swap the existing CPU path already performs.

**Exception:** when `interpolationSpace` is set on the corner-mode area, the builder returns `null` and the component stays on `sampleBilinearGrid`. The two row gradients could be densified into stops in the requested space, but the vertical lerp would still be a sRGB alpha composite, so the result would be perceptual on one axis and not the other. Silently half-honouring the prop is worse than not taking the CSS path.

### Area, HSV `s` × `v` — exact

```
layer 0:  <hue>                                        (solid, s = 1, v = 1)
layer 1:  linear-gradient(to right, #fff, transparent)
layer 2:  linear-gradient(to top,   #000, transparent)
```

At `v = 1`, HSV gives `max = 1` and `min = 1 - s`, which is `lerp(white, pureHue, s)` — the white layer at alpha `1 - s`. Multiplying by `v` scales every channel uniformly, which is the black layer at alpha `1 - v`. Both layers are exact, not approximations.

Directions flip with `isSlidingFromLeft` and `isSlidingFromTop`.

### Area, HSL `s` × `l` — exact

```
layer 0:  linear-gradient(to right, #808080, <hue>)
layer 1:  linear-gradient(to top,
            #000 0%, rgb(0 0 0 / 0) 50%,
            rgb(255 255 255 / 0) 50%, #fff 100%)
```

For `l > 0.5` the overlay applies white at alpha `2l - 1`:

```
(1 - (2l-1)) · (0.5 + s(hue - 0.5)) + (2l-1)
  = l + 2s(1-l)(hue - 0.5)
```

and HSL's own definition gives `l + s·(1 - |2l - 1|)·(hue - 0.5)`, which for `l > 0.5` is `l + 2s(1-l)(hue - 0.5)`. Identical. For `l < 0.5` the overlay applies black at alpha `1 - 2l`, giving `2l·(0.5 + s(hue - 0.5)) = l + 2ls(hue - 0.5)`, and HSL gives `l + s·(2l)·(hue - 0.5)`. Identical again.

The doubled stop at 50% pairs transparent black with transparent white so neither half of the ramp interpolates through the other's premultiplied color. Both stops are fully transparent, so the hard stop is invisible.

### Area, one axis is `alpha` — exact, any space

```
layer 0:  linear-gradient(<real axis>, <stop0>, …, <stopN>)
          mask-image: linear-gradient(<alpha axis>, transparent, #000)
```

The real channel is sampled into stops in JavaScript, so this works in every space including `oklch` and `lab`. The alpha ramp reproduces what the current hand-rolled loop writes into the pixel alpha byte.

### Area, everything else — null

Both axes real, in a space with no recipe above: `oklch` `c`×`l`, `oklab` `a`×`b`, `lab`, `lch`, `hwb`, and the `srgb` family. Canvas.

### Wheel, `h` × `s` on `hsv` and `hsl` — exact

```
layer 0:  conic-gradient(from <startAngle>deg, <hue stops at s = max>)
layer 1:  radial-gradient(circle closest-side,
            <color at s = min>, transparent)
```

Saturation is a linear lerp toward gray in both spaces at fixed `v` or `l`, so the radial overlay is exact. `samplePolarGrid` clamps `r` to 1, and a radial gradient holds its final color past 100%, so the corners match.

`samplePolarGrid` normalizes `dx` and `dy` by half-width and half-height independently, which is an ellipse; `closest-side` on a circle is not. The two agree for a square wheel, which is what `ColorWheelRoot`'s `border-radius: 50%` and the `clip-path: circle(50%)` on the canvas already assume. A non-square wheel is out of scope for the CSS path — if one is ever wanted, `radial-gradient(ellipse closest-side, …)` is the fix.

Any other angle/radius channel pair, or any other space, returns `null`.

### Triangle — always canvas

No recipe.

## Stop counts

`interpolateStops` densifies to 32 today; the auto-computed slider stops are 12. The CSS path defaults to:

- **36 stops** for cyclic channels — hue at 10° increments. Hue rainbows are where sRGB-lerp banding is most visible, and 36 is the point where the chord error falls below a perceptible step.
- **16 stops** for monotonic channels.
- **32 stops** when `interpolationSpace` is set, matching `interpolateStops`'s existing count, with the stops themselves computed in the requested space exactly as `interpolateStops` computes them today. The sRGB lerp between 32 dense perceptual stops is visually indistinguishable from the GPU result it replaces.

These are defaults on the builders' `StopOptions`, not literals at call sites.

## The `renderer` prop

Added to all five gradient components in all four packages.

```ts
/**
 * Which painter to use.
 * - `"auto"` (default) — CSS when an exact recipe exists, canvas otherwise
 * - `"css"` — force CSS; falls back to canvas with a dev warning if no recipe exists
 * - `"canvas"` — force the canvas painter
 */
renderer?: "auto" | "css" | "canvas";
```

`"canvas"` is the escape hatch: if a recipe ever drifts from its sampler, or a consumer needs pixel-exact parity with an older release, one prop restores the previous behavior without a downgrade.

The dev warning on `"css"` with no recipe follows `warnCheckerboardDeprecated`'s pattern — once per process, silent when `NODE_ENV === "production"`.

## Framework wiring

Per component, two derived values:

```
cssLayers  = builder(...) when renderer !== "canvas", else null
renderMode = cssLayers ? "css" : "canvas"
```

The template branches between the spans and the `<canvas>`.

The canvas lifecycle is not restructured. `useGradientCanvas` and its React, Svelte and Angular counterparts are still called unconditionally — hooks cannot be conditional — and the existing `if (!canvas) return` in `render()` already makes them inert when the ref is never populated. The `usesWebGL` teardown guards the same null. This keeps the diff in each component to a computed, a template branch, and one prop.

Files touched, per framework:

- `vue`: `ColorSlider/ColorSliderGradient.vue`, `ColorRing/ColorRingGradient.vue`, `ColorArea/ColorAreaGradient.vue`, `ColorWheel/ColorWheelGradient.vue`, `ColorTriangle/ColorTriangleGradient.vue`, plus a `shared/useCssGradient.ts` holding `collapseLayers` and the renderer resolution
- `react`: `src/components/color-*/gradient/*.tsx` and a `shared/` equivalent
- `svelte`: `src/lib/components/color-*/gradient/*.svelte` and `src/lib/shared/`
- `angular`: `src/components/color-*/gradient/*.ts`

`ColorTriangleGradient` gains only the `renderer` prop, for API symmetry; `"css"` on it warns and paints the canvas.

## Testing

**`packages/shared/test/css-gradient.test.ts`** — exact string assertions for each recipe, and `null` assertions for each combination that must stay on canvas (`oklch` `c`×`l`, `oklab` `a`×`b`, `hwb`, `srgb` pairs, corner mode with `interpolationSpace`, non-`h`/`s` wheel pairs). The builders touch no DOM, so these run with no environment. Also covers the angle conversion, the conic origin, the stop-count defaults including the cyclic case, and `collapseLayers` — that a mask-free run merges and reverses, and that a masked layer splits the run.

**Per framework** — for each of the five components: `renderer="auto"` in HSV renders no `<canvas>` and a non-empty background; the same component in `oklch` with two real channels renders a `<canvas>`; `renderer="canvas"` renders a `<canvas>` regardless.

**SSR** — `@vue/server-renderer` does not currently resolve in this workspace. If adding it is a one-line devDependency, `ColorSlider` and an HSV `ColorArea` get a real `renderToString` assertion. If it is not, the DOM-free builder tests plus the no-canvas mount tests carry the guarantee: the builders provably need no browser, and the components provably emit no canvas.

**Existing tests to update** — `packages/vue/test/useGradientCanvas.test.ts`, `packages/vue/test/ColorSlider.test.ts`, `packages/vue/test/ColorAreaGradient.test.ts`, and the React `*.test.tsx` files under each `gradient/` directory, all of which assert canvas presence under what is about to become the CSS default.

## Sequencing

1. `@urcolor/shared` — `css-gradient.ts` and its unit tests. Self-contained; nothing else changes.
2. Vue — five components, `useCssGradient.ts`, updated tests. Establishes the wiring shape.
3. React, Svelte, Angular — a mechanical mirror of step 2, one framework per commit.
4. Docs — a `renderer` prop row on each of the five component reference pages, registered in the sidebar per `CLAUDE.md`, and a note in the guide about server rendering.

## Out of scope

- **HWB areas.** `w` + `b` > 1 triggers a normalization that is not a plain composite. Canvas.
- **`srgb` `r`×`g` areas.** These *are* bilinear and would work through `cssAreaBilinear`, but wiring channel-pair areas into the corner-mode builder is a separate change from the recipes above. Canvas for now.
- **Native CSS interpolation** (`linear-gradient(in oklab, …)`). Fewer stops and browser-native perceptual blending, but it needs Chrome 111+, Safari 16.2+ and Firefox 128+ with no graceful degradation. Dense pre-computed stops reach the same result with no floor on browser support.
- **Non-square wheels.**
- **Triangle.**

## Risks

- **Conic banding.** 36 hue stops is a reasoned default, not a measured one. It needs a visual check against the current 128×128 `sampleConicRing` output before the ring ships.
- **Recipe drift.** The three exactness derivations above are algebraic and hold, but they hold against the *current* samplers. A future change to `sampleChannelGrid` or `samplePolarGrid` would need the matching recipe updated. The unit tests pin the CSS strings, not the equivalence — pixel-diff tests in a real browser would pin the equivalence, and that runner does not exist in this repo yet.
- **Mask support.** `mask-image` needs the `-webkit-` prefix for older Safari; the ring's `checkerboardMask` already writes both, and the new layers follow it.

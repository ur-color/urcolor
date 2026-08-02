# Hero Orbit — Instrument Cluster Home Page

Date: 2026-08-02
Status: Approved, ready for implementation planning

## Problem

The VitePress home page (`docs/index.md` → `HeroSection.vue`) reads flat. Every
piece is individually polished — an animated WebGL background, a word-cycling
title, a live picker, a features grid — but they are stacked in a single 960px
centered column. A vertical stack of centered blocks has no depth and no focal
point, so nothing on the page looks composed.

The picker also lands below the fold. `HeroSection` opens with 180px of top
padding, then the title, tagline and buttons, before `HeroDemo` appears. A
visitor's first screenful is text.

## Goal

Replace the stacked hero with an **orbit instrument cluster**: one large
interactive color instrument at the center of the viewport, surrounded by
docked satellite controls joined to it by connector lines. The picker is the
first thing on screen, the exotic components (`ColorWheel`, `ColorTriangle`,
`ColorRing`) get shown off instead of hidden in the docs, and the composition
has a clear focal point.

Success criteria:

1. An interactive picker is visible without scrolling at 1280×800.
2. The cluster shows `ColorRing`, `ColorTriangle`, `ColorWheel`, `ColorArea`,
   `ColorSlider`, `ColorField` and `ColorSwatchPicker` — the full component
   surface — all driven by one shared color.
3. `bun run docs:build` succeeds and `bun run lint` is clean.
4. Honors `prefers-reduced-motion: reduce`.
5. Usable down to 360px viewport width.

## Non-goals

- Redesigning `FeaturesGrid`, the nav, or any docs page. Only the hero changes.
- Changing anything in `packages/*`. This is docs-only work. If a hero
  requirement cannot be met with the current public component API, the hero
  adapts — the library does not.
- Replacing `HeroBgCanvas`. It stays exactly as-is, including its hue sync.

## Architecture

### Shared state

A single composable owns the hero's color.

`docs/.vitepress/composables/useHeroColor.ts`

```ts
import { shallowRef, inject, provide, type InjectionKey, type ShallowRef } from "vue";
import { Color } from "@urcolor/core";

const KEY: InjectionKey<ShallowRef<Color>> = Symbol("hero-color");

export function provideHeroColor(): ShallowRef<Color> {
  const color = shallowRef<Color>(new Color("hsv", [328, 1, 1]));
  provide(KEY, color);
  return color;
}

export function useHeroColor(): ShallowRef<Color> {
  const color = inject(KEY);
  if (!color) throw new Error("useHeroColor() called outside a provideHeroColor() tree");
  return color;
}
```

Satellites write with `color.value = next` guarded by an `if (next)` check, the
same shape as `HeroDemo`'s current `onColorUpdate` — the primitives emit
`Color | undefined`.

`HeroSection.vue` calls `provideHeroColor()`. Every instrument and satellite
calls `useHeroColor()` — no prop drilling, no `emit` chains. Initial value
`new Color("hsv", [328, 1, 1])`, matching today's `HeroDemo`.

The existing `useBrandHue` wiring moves out of `HeroDemo` into `HeroOrbit.vue`:
watch the hero color, push `h` into `brandHue`, and set the `--vp-c-brand-*`
CSS custom properties. Behavior is unchanged; only its home moves.
`HeroBgCanvas` keeps watching `brandHue` and needs no edit.

Because state is shared and every satellite is a real control, a drag on the
ring updates the sliders, the fields, the format readout, the background
shader and the site's brand color in the same frame.

### Component tree

```
HeroSection.vue          provides hero color; owns page rhythm
├─ HeroBgCanvas.vue      unchanged
├─ HeroTitle.vue         unchanged markup, smaller type (see below)
├─ HeroOrbit.vue         the stage: geometry, connectors, parallax, mode
│  ├─ HeroConnectors.vue SVG layer, computed paths
│  ├─ HeroInstrument.vue ring + morphing core
│  └─ HeroSatellite.vue  ×5, dock wrapper — position, depth, entrance
│     ├─ hero/SatHex.vue        ColorField, format="hex"
│     ├─ hero/SatFormats.vue    read-only format readout
│     ├─ hero/SatSwatches.vue   ColorSwatchPicker ramp
│     ├─ hero/SatSliders.vue    4× ColorSlider
│     └─ hero/SatFields.vue     4× ColorField (H/S/V/A)
├─ hero CTAs             Get Started / Components
└─ FeaturesGrid.vue      unchanged
```

Each unit has one job. `HeroOrbit` knows where things go and never knows what
is inside them. `HeroSatellite` knows how to dock and animate, never what it
wraps. The `hero/Sat*.vue` leaves know only how to read and write the shared
color. Any satellite can be swapped without touching the stage.

Imports follow the existing `HeroDemo` convention — relative paths into
`../../../packages/vue/src/components/*`, not the `@urcolor/vue` package
entry, so the docs build picks up local source.

## Geometry

`HeroOrbit` is a stage with `container-type: size`. Docks are absolutely
positioned on an ellipse using native CSS trigonometry — no JS layout math, so
positions survive resize with no reflow pass.

Each dock carries two custom properties:

```css
.hero-dock {
  --angle: 135deg;      /* set per dock */
  --depth: 2;           /* parallax layer, 1–3 */
  position: absolute;
  left: calc(50% + cos(var(--angle)) * var(--orbit-rx));
  top:  calc(50% - sin(var(--angle)) * var(--orbit-ry));
  translate: -50% -50%;
}
```

Stage radii:

```css
.hero-orbit {
  --orbit-rx: clamp(240px, 34cqw, 430px);
  --orbit-ry: clamp(150px, 30cqh, 270px);
}
```

`cos()`/`sin()` in `calc()` are supported in all VitePress-target browsers
(Chrome 111+, Safari 15.4+, Firefox 108+). If a dock lands with its content
overflowing the stage edge, the fix is to adjust that dock's `--angle` and the
clamp ceilings — never to reintroduce JS positioning.

Dock table (angle measured counterclockwise from the positive x-axis):

| Dock | Angle | Depth | Contents |
|---|---|---|---|
| Hex | 135° | 1 | `SatHex` — `ColorFieldRoot format="hex"` |
| Formats | 45° | 1 | `SatFormats` — read-only strings |
| Swatches | 180° | 3 | `SatSwatches` — `ColorSwatchPicker` ramp |
| Sliders | 0° | 3 | `SatSliders` — H, S, V, A |
| Fields | 270° | 2 | `SatFields` — H/S/V/A number inputs, laid out wide |

The instrument occupies the ellipse center at
`clamp(280px, 44vmin, 460px)` square.

## Instrument

`HeroInstrument.vue` composes an outer hue ring around a morphing core.

Outer ring — always present, always the same:

```
ColorRingRoot  color-space="hsv"  channel="h"  :inner-radius="0.82"
  ColorRingTrack
    ColorRingGradient
    ColorRingThumb
```

Inner core — absolutely positioned inside the ring's inner circle, inset so its
bounding box is inscribed (`inset: 22%`). It cycles through three modes on a
6-second timer:

| Mode | Component | Config |
|---|---|---|
| `triangle` | `ColorTriangleRoot` | `hsv`, x=`s`, y=`v` |
| `wheel` | `ColorWheelRoot` | `hsv`, angle=`h`, radius=`s` |
| `area` | `ColorAreaRoot` | `hsv`, x=`s`, y=`v`, `y-inverted` |

Transition: 700ms GSAP crossfade, outgoing `opacity 1→0, scale 1→0.94`,
incoming `opacity 0→1, scale 0.94→1`, `power2.inOut`, overlapping. Only the
active mode and the incoming mode are mounted; the third is unmounted so its
gradient canvas is not kept alive. Gradients render to a 2D canvas via
`renderToCanvas`, so canvas count is a memory question, not a WebGL context
limit — but unmounting keeps the idle cost at zero regardless.

The `area` mode is square while the other two are round. It renders with
`border-radius: 50%; overflow: clip` so the core silhouette stays circular
across all three modes and the crossfade does not change the shape.

The timer pauses when:

- any pointer is down on the instrument or a satellite (tracked by a
  `isInteracting` flag in `HeroOrbit`, set on `pointerdown`/`pointerup` at the
  stage level),
- the tab is hidden (`document.visibilitychange`),
- `prefers-reduced-motion: reduce` — in which case the core never leaves
  `triangle`.

## Connectors

`HeroConnectors.vue` renders one SVG layer behind the satellites, sized to the
stage, drawing a path from the instrument's edge to each dock's anchor.

Paths are computed in JS, not CSS, because the endpoints depend on the real
rendered size of each dock:

1. A `ResizeObserver` on the stage recomputes on any size change.
2. For each dock, read `getBoundingClientRect()` for the dock and the
   instrument, convert both to stage-local coordinates.
3. Start point: the instrument's center projected onto its edge along the
   dock's angle. End point: the nearest edge midpoint of the dock's box.
4. Draw a quadratic path with a slight outward bow (control point offset 8% of
   segment length, perpendicular).

Styling: `stroke: color-mix(in srgb, var(--vp-c-brand-1) 45%, transparent)`,
`stroke-width: 1`, plus a 3px dot at each endpoint. Because `--vp-c-brand-1` is
already being driven by the hero color, connectors retint for free.

Pulse: each path is duplicated as an overlay with a short dash
(`stroke-dasharray: 24 <pathLength>`). On color change, a GSAP tween drives
`stroke-dashoffset` from `pathLength` to `0` over 600ms, staggered 40ms per
connector, so a highlight travels core → satellite. The tween is killed and
restarted on each change, so a continuous drag produces one trailing pulse
rather than a queue. Suppressed entirely under reduced motion.

## Motion

| Element | Behavior | Reduced motion |
|---|---|---|
| Core morph | 6s cycle, 700ms crossfade | frozen on `triangle` |
| Connectors | dash pulse on color change, 600ms, 40ms stagger | static lines |
| Cluster parallax | pointer-tracked, max ±6px translate and ±3deg tilt, damped by depth (`depth 1` moves least), lerped at 0.08/frame | disabled |
| Entrance | satellites tween from the instrument center to their docks, 60ms stagger, `power3.out` | rendered in place |

The cluster is **docked, not revolving**. Drag targets never move under the
cursor. The sense of orbit comes from the elliptical arrangement, the
connectors and the parallax depth — not from rotation.

Parallax is a single `pointermove` listener on the stage writing a CSS custom
property per depth layer; each dock reads it. One listener, no per-element
handlers.

`gsap` is already a dependency and is already dynamically imported in
`HeroSection`/`HeroTitle`. Keep that pattern: import inside `onMounted`, never
at module scope, so SSR is unaffected.

## Satellite contents

**SatHex** — one `ColorFieldRoot` with `format="hex"` and a `ColorFieldInput`,
uppercase mono. Two-way: typing a valid hex moves the instrument.

**SatFormats** — read-only. Four `<code>` lines derived from the shared color
via `color.toString(format)`: `oklch`, `lch`, `hsl`, `display-p3`. Each line
is `aria-live="off"`; this is decorative telemetry, not an announcement
target. This satellite is the one that communicates "real color science
underneath".

**SatSwatches** — a `ColorSwatchPickerRoot` with eight items forming a
lightness ramp at the current hue: `hsl(h, 85%, L)` for
`L ∈ {12, 24, 36, 48, 60, 72, 84, 92}`. The ramp recomputes as the hue
changes, so it always reads as a palette of the picked color. Items use
`ColorSwatchPickerItemSwatch` plus a `Check` indicator, matching the existing
`ColorSwatchPickerBasic` demo. Clicking an item sets the hero color.

**SatSliders** — four `ColorSliderRoot` (`h`, `s`, `v`, `alpha`) in a vertical
stack, lifted from the current `HeroDemo` markup including its
`channel-overrides` and alpha checkerboard track.

**SatFields** — four `ColorFieldRoot` bound to channels `h`, `s`, `v`, `alpha`
with `H`/`S`/`V`/`A` labels, in a single wide row, lifted from `HeroDemo`.

All satellite markup uses the same Tailwind thumb/track styling already
present in `HeroDemo` so the visual language does not change mid-redesign.

## Responsive

Three modes, selected by container width. `HeroOrbit` sets a `data-mode`
attribute; all layout differences are CSS keyed off it.

**`orbit` — ≥1100px.** Full ellipse, five docks, connectors visible.

**`compact` — 700–1100px.** Four docks. `SatFormats` unmounts and its content
renders inside the hex satellite as two extra lines. Radii clamp down; the
instrument shrinks toward its `280px` floor. Connectors visible.

**`stack` — <700px.** The orbit dissolves. Docks lose absolute positioning and
render as a normal vertical flow: instrument, swatches, sliders, fields, hex +
formats. Connectors unmount — there is nothing meaningful to connect in a
single column, and drawing them would be noise. Parallax is disabled; the core
morph continues.

The stack mode is the honest fallback. Elliptical geometry cannot survive a
360px viewport, and squeezing it produces overlapping drag targets. Vertical
flow at narrow widths is the correct answer, not a compromise.

## HeroSection changes

- Remove the `ScrollTrigger` `rotateX` effect and the `perspectiveEl` ref. The
  cluster is now the visual interest; a scroll-driven tilt on top of it is
  competing motion. `ScrollTrigger` is no longer imported.
- Remove the 960px `max-width` and the 180px top padding. The hero becomes
  full-bleed with `min-height: calc(100dvh - var(--vp-nav-height))` and a
  centered inner grid.
- `HeroTitle` type scale drops from `clamp(2rem, 8vw, 5.5rem)` to
  `clamp(2rem, 6vw, 3.5rem)` so the title plus the instrument fit above the
  fold at 1280×800. `HeroTitle.vue`'s own styles change only in that one
  declaration; its word-cycling logic is untouched.
- CTAs move below the cluster, unchanged in style.
- `FeaturesGrid` follows the hero in normal flow, unchanged, and now sits
  genuinely below the fold where it belongs.
- The `.hero-demo-skeleton*` CSS block is dead once `HeroDemo` is gone and is
  deleted with it.

`HeroDemo.vue` is deleted. Its markup is not lost — it is redistributed into
`hero/SatSliders.vue` and `hero/SatFields.vue`.

## Accessibility

- Every interactive part is an existing urcolor primitive, so the WAI-ARIA
  color picker semantics, keyboard handling and focus rings come for free.
  Nothing in the hero hand-rolls a control.
- The connector SVG is `aria-hidden="true"` and `pointer-events: none`.
- Focus order follows DOM order, which is: instrument, then satellites in
  reading order (hex, formats, swatches, sliders, fields) — not orbital order.
  DOM order is authored for the reader; CSS positions for the eye.
- The core morph must not steal or drop focus. If focus is inside the core when
  a crossfade begins, the morph is deferred until focus leaves — a control
  disappearing under the keyboard is worse than a late transition.
- `prefers-reduced-motion: reduce` disables morph, parallax, entrance and
  pulses, as tabulated above.

## Risks

**Above-fold fit.** The tightest case is 1280×800 with the nav bar. Budget:
nav 64px, title ~56px, cluster ~440px, CTAs ~48px, margins ~140px ≈ 748px.
It fits, but with little slack. If it overflows during implementation, the
lever is the `--orbit-ry` clamp ceiling, then the instrument's `44vmin`, in
that order — not the title.

**Canvas count.** At peak (mid-crossfade) the page runs: background WebGL, ring
gradient, two core gradients, four slider gradients, eight swatch gradients =
16 canvases. All but the background are small 2D canvases redrawn only on
color change. If profiling shows this is too heavy, the swatch ramp is the
first thing to render as plain CSS backgrounds instead of components.

**Connector jitter.** Paths recompute on resize. If they visibly lag during a
window drag, the recompute moves behind a `requestAnimationFrame` coalescer.

## Verification

- `bun run lint` clean (`eslint` + `vue-tsc`).
- `bun run docs:build` succeeds.
- Manual, via `bun run docs:dev`:
  - Picker visible without scrolling at 1280×800.
  - Dragging the ring updates sliders, fields, hex, formats, swatch ramp,
    background shader and nav brand color together.
  - Core cycles triangle → wheel → area and pauses during a drag.
  - Tab-through reaches every control; focus rings visible; core does not morph
    while focus is inside it.
  - All three responsive modes render correctly at 1440px, 900px and 375px.
  - With reduced motion forced on, nothing animates and the core stays on
    triangle.

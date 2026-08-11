# Lift Gradient Stop Resolution Into @urcolor/shared Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the gradient stop-resolution logic that is currently duplicated in Vue, React, Svelte and Angular into `@urcolor/shared`, so the three new hand-ported packages consume it instead of adding a fifth, sixth and seventh copy.

**Architecture:** Add `packages/shared/src/gradient-stops.ts` exporting pure functions that turn a colour, space, channel and options object into a stop list, an opacity and a CSS-layer decision. Refactor the four existing packages onto it. Each framework's gradient component keeps only its own rendering: the element tree, the canvas lifecycle and the reactive plumbing.

**Tech Stack:** TypeScript, `@urcolor/core`, `bun test`.

## Global Constraints

- Rendered output must not change. Same stops, same opacity, same CSS-vs-canvas decision, same DOM.
- `@urcolor/shared` stays framework-agnostic: no DOM element creation, no reactivity, no framework imports. `renderToCanvas` and `drawLinearGradient` already take a canvas and are the only DOM-touching exports; the new module adds none.
- Extraction source of truth: `packages/svelte/src/lib/components/color-slider/gradient/ColorSliderGradient.svelte`. It is the most recent implementation and the one carrying the CSS-recipe path from commits `71b0b93`..`c2f8283`.
- Every existing test must keep passing, and `bun run build` must stay green after each task.
- The per-component constants `AUTO_STEPS = 12` and `INTERPOLATION_STEPS = 32` move into the shared module as named exports; they are not re-declared per framework.

---

## File Structure

**Created:**

| File | Responsibility |
| --- | --- |
| `packages/shared/src/gradient-stops.ts` | Stop resolution, override application, opacity, for all gradient families |
| `packages/shared/src/gradient-stops.test.ts` | Unit tests for the above |

**Modified:** `packages/shared/src/index.ts`, and the four slider gradient components:
- `packages/vue/src/components/ColorSlider/ColorSliderGradient.vue`
- `packages/react/src/components/color-slider/gradient/ColorSliderGradient.tsx`
- `packages/svelte/src/lib/components/color-slider/gradient/ColorSliderGradient.svelte`
- `packages/angular/src/components/color-slider/gradient/color-slider-gradient.ts`

**Scope boundary.** This plan lifts the *slider* family only. Area, wheel, ring and triangle gradients have their own stop logic (`sampleBilinearGrid`, `samplePolarGrid`, `sampleTriangleGrid` already live in `shared`, but their option handling does not). Lifting those is the same shape of work and is deliberately left out: the slider is the one the three new ports need first, and a single-family change is reviewable. A follow-up plan covers the rest.

---

### Task 1: The shared module

**Files:**
- Create: `packages/shared/src/gradient-stops.ts`
- Test: `packages/shared/src/gradient-stops.test.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Consumes: `Color`, `SpaceId` from `@urcolor/core`; `getChannelConfig` from `./color-spaces`; `interpolateStops` from `./gradient`.
- Produces:
  - `const SLIDER_CANVAS_STEPS = 12`
  - `const SLIDER_INTERPOLATION_STEPS = 32`
  - `interface ChannelOverrides = Record<string, number> | false`
  - `function applyChannelOverrides(base: Color, colorSpace: SpaceId, overrides: ChannelOverrides): Color`
  - `function gradientOpacity(color: Color, channel: string, overrides: ChannelOverrides): number`
  - `interface SliderStopsOptions { color: Color; colorSpace: SpaceId; channel: string; colors?: string[]; channelOverrides?: ChannelOverrides; interpolationSpace?: SpaceId; steps: number; mirrored: boolean; }`
  - `function sliderStops(options: SliderStopsOptions): Color[] | null`

- [ ] **Step 1: Write the failing test**

Create `packages/shared/src/gradient-stops.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { Color } from "@urcolor/core";
import {
  applyChannelOverrides,
  gradientOpacity,
  sliderStops,
  SLIDER_CANVAS_STEPS,
} from "./gradient-stops";

const BASE = Color.parse("hsl(210, 80%, 50%)")!;

describe("applyChannelOverrides", () => {
  test("returns the base untouched when overrides are false", () => {
    expect(applyChannelOverrides(BASE, "hsl", false)).toBe(BASE);
  });

  test("locks alpha", () => {
    const result = applyChannelOverrides(BASE.withAlpha(0.4), "hsl", { alpha: 1 });
    expect(result.alpha).toBe(1);
  });

  test("ignores channels the space does not have", () => {
    const result = applyChannelOverrides(BASE, "hsl", { nonsense: 5, s: 0.2 });
    expect(Math.round(result.to("hsl").get("s") * 100)).toBe(20);
  });
});

describe("gradientOpacity", () => {
  test("is 1 for the alpha channel itself", () => {
    expect(gradientOpacity(BASE.withAlpha(0.3), "alpha", { alpha: 1 })).toBe(1);
  });

  test("is 1 when alpha is locked by an override", () => {
    expect(gradientOpacity(BASE.withAlpha(0.3), "h", { alpha: 1 })).toBe(1);
  });

  test("follows the colour's alpha when nothing locks it", () => {
    expect(gradientOpacity(BASE.withAlpha(0.3), "h", false)).toBeCloseTo(0.3, 5);
  });
});

describe("sliderStops", () => {
  test("sweeps the channel across its native range", () => {
    const stops = sliderStops({
      color: BASE, colorSpace: "hsl", channel: "h",
      steps: SLIDER_CANVAS_STEPS, mirrored: false,
    })!;
    expect(stops.length).toBe(SLIDER_CANVAS_STEPS);
    expect(Math.round(stops[0]!.to("hsl").get("h"))).toBe(0);
    expect(Math.round(stops.at(-1)!.to("hsl").get("h"))).toBe(360);
  });

  test("returns a transparent-to-opaque pair for the alpha channel", () => {
    const stops = sliderStops({
      color: BASE, colorSpace: "hsl", channel: "alpha",
      steps: SLIDER_CANVAS_STEPS, mirrored: false,
    })!;
    expect(stops.length).toBe(2);
    expect(stops[0]!.alpha).toBe(0);
    expect(stops[1]!.alpha).toBe(1);
  });

  test("reverses the stops when mirrored", () => {
    const plain = sliderStops({ color: BASE, colorSpace: "hsl", channel: "h", steps: 4, mirrored: false })!;
    const mirrored = sliderStops({ color: BASE, colorSpace: "hsl", channel: "h", steps: 4, mirrored: true })!;
    expect(mirrored.map(c => Math.round(c.to("hsl").get("h"))))
      .toEqual(plain.map(c => Math.round(c.to("hsl").get("h"))).reverse());
  });

  test("uses explicit colours when given", () => {
    const stops = sliderStops({
      color: BASE, colorSpace: "hsl", channel: "h",
      colors: ["#ff0000", "#0000ff"], steps: 4, mirrored: false,
    })!;
    expect(stops.length).toBe(2);
  });

  test("returns null when an explicit colour fails to parse", () => {
    expect(sliderStops({
      color: BASE, colorSpace: "hsl", channel: "h",
      colors: ["#ff0000", "not-a-color"], steps: 4, mirrored: false,
    })).toBeNull();
  });

  test("returns null for fewer than two explicit colours", () => {
    expect(sliderStops({
      color: BASE, colorSpace: "hsl", channel: "h",
      colors: ["#ff0000"], steps: 4, mirrored: false,
    })).toBeNull();
  });

  test("densifies to the interpolation step count when a space is given", () => {
    const stops = sliderStops({
      color: BASE, colorSpace: "hsl", channel: "h",
      steps: 4, mirrored: false, interpolationSpace: "oklab",
    })!;
    expect(stops.length).toBe(32);
  });

  test("returns null for a channel the space does not have", () => {
    expect(sliderStops({
      color: BASE, colorSpace: "hsl", channel: "nonsense",
      steps: 4, mirrored: false,
    })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/shared/src/gradient-stops.test.ts`
Expected: FAIL, cannot resolve `./gradient-stops`.

- [ ] **Step 3: Write the module**

Create `packages/shared/src/gradient-stops.ts`. Every function here is lifted verbatim from `ColorSliderGradient.svelte`, with the reactive context reads replaced by explicit parameters.

```ts
import { Color, type SpaceId } from "@urcolor/core";
import { getChannelConfig } from "./color-spaces";
import { interpolateStops } from "./gradient";

/** Stop count the WebGL painter asks for: the shader holds 16 uniform slots. */
export const SLIDER_CANVAS_STEPS = 12;
/** Stop count a perceptual interpolation densifies to. */
export const SLIDER_INTERPOLATION_STEPS = 32;

/**
 * Channels pinned to a fixed value across the gradient, so a hue sweep is not
 * also a lightness sweep. `false` disables the whole mechanism.
 */
export type ChannelOverrides = Record<string, number> | false;

/** Applies the non-alpha overrides, then alpha, to a base colour. */
export function applyChannelOverrides(
  base: Color,
  colorSpace: SpaceId,
  overrides: ChannelOverrides,
): Color {
  if (overrides === false) return base;

  const applicable: Record<string, number> = {};
  for (const [key, value] of Object.entries(overrides)) {
    if (key !== "alpha" && getChannelConfig(colorSpace, key)) applicable[key] = value;
  }

  let result = base;
  if (Object.keys(applicable).length > 0) {
    result = result.with({ space: colorSpace, ...applicable });
  }
  if (overrides.alpha !== undefined) result = result.withAlpha(overrides.alpha);
  return result;
}

/**
 * Opacity the painted surface carries.
 *
 * An alpha slider paints its own transparency into the stops, so the surface
 * stays fully opaque. Any other channel shows the colour's alpha, unless an
 * override has pinned alpha, in which case the stops already carry it.
 */
export function gradientOpacity(
  color: Color,
  channel: string,
  overrides: ChannelOverrides,
): number {
  if (channel === "alpha") return 1;
  if (overrides === false || overrides.alpha === undefined) return color.alpha;
  return 1;
}

export interface SliderStopsOptions {
  /** The slider's current colour. */
  color: Color;
  colorSpace: SpaceId;
  /** The channel being swept, or `"alpha"`. */
  channel: string;
  /** Explicit stops. When omitted they are computed from the channel. */
  colors?: string[];
  /** Defaults to `{ alpha: 1 }` at the component boundary, not here. */
  channelOverrides?: ChannelOverrides;
  /** Interpolate in this space for perceptual accuracy. */
  interpolationSpace?: SpaceId;
  /** How many stops to compute before any interpolation. */
  steps: number;
  /** Reverse the stops rather than flipping the gradient. */
  mirrored: boolean;
}

/** Stops swept across the channel's native range, or null if unresolvable. */
function autoStops(options: SliderStopsOptions): Color[] | null {
  const { color, colorSpace, channel, channelOverrides = { alpha: 1 }, steps } = options;
  const base = applyChannelOverrides(color, colorSpace, channelOverrides);

  if (channel === "alpha") return [base.withAlpha(0), base.withAlpha(1)];

  const config = getChannelConfig(colorSpace, channel);
  if (!config) return null;

  const min = config.nativeMin ?? config.min;
  const max = config.nativeMax ?? config.max;
  const stops: Color[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    stops.push(base.with({ space: colorSpace, [channel]: min + t * (max - min) }));
  }
  return stops;
}

/**
 * The stop list both painters draw, differing only in how many stops they can
 * hold: the shader has 16 uniform slots, CSS has no ceiling.
 */
export function sliderStops(options: SliderStopsOptions): Color[] | null {
  let stops: Color[];

  if (options.colors) {
    const parsed = options.colors.map(entry => Color.parse(entry));
    if (parsed.length < 2 || parsed.some(entry => !entry)) return null;
    stops = parsed as Color[];
  } else {
    const auto = autoStops(options);
    if (!auto || auto.length < 2) return null;
    stops = auto;
  }

  if (options.mirrored) stops = [...stops].reverse();
  return options.interpolationSpace
    ? interpolateStops(stops, SLIDER_INTERPOLATION_STEPS, options.interpolationSpace)
    : stops;
}
```

- [ ] **Step 4: Export from the barrel**

In `packages/shared/src/index.ts`, add after the `./gradient` line:

```ts
export * from "./gradient-stops";
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test packages/shared/src/gradient-stops.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/gradient-stops.ts packages/shared/src/gradient-stops.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): lift slider gradient stop resolution out of the framework packages"
```

---

### Task 2: Refactor the Svelte slider gradient

Svelte first, because it is the extraction source: if the shared module and the component disagree, the component is right and the module is wrong.

**Files:**
- Modify: `packages/svelte/src/lib/components/color-slider/gradient/ColorSliderGradient.svelte`

**Interfaces:**
- Consumes: `sliderStops`, `gradientOpacity`, `SLIDER_CANVAS_STEPS` from `@urcolor/shared`.
- Produces: no API change.

- [ ] **Step 1: Delete the lifted code**

Remove from the component: the `AUTO_STEPS` and `INTERPOLATION_STEPS` constants, `withOverrides`, `buildAutoColors`, `resolveStops`, and the `canvasOpacity` derivation body.

- [ ] **Step 2: Import the shared functions**

Extend the existing `@urcolor/shared` import with `gradientOpacity`, `sliderStops` and `SLIDER_CANVAS_STEPS`, and drop `getChannelConfig` and `interpolateStops` if nothing else in the file uses them.

- [ ] **Step 3: Reintroduce them as derivations**

```svelte
  const canvasOpacity = $derived(
    gradientOpacity(context.color, context.channel, channelOverrides),
  );

  /** Stops for a given step count, in the slider's own axis direction. */
  function resolveStops(steps: number) {
    return sliderStops({
      color: context.color,
      colorSpace: context.colorSpace,
      channel: context.channel,
      colors: colorsProp,
      channelOverrides,
      interpolationSpace,
      steps,
      mirrored,
    });
  }
```

`paint` and the `cssLayers` derivation call `resolveStops` exactly as before, so neither changes. `SLIDER_CANVAS_STEPS` replaces `AUTO_STEPS` at both call sites.

- [ ] **Step 4: Verify**

Run: `bun run --cwd packages/svelte check && bun test`
Expected: clean, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/svelte/src/lib/components/color-slider/gradient/ColorSliderGradient.svelte
git commit -m "refactor(svelte): use the shared slider gradient stops"
```

---

### Task 3: Refactor the React slider gradient

**Files:**
- Modify: `packages/react/src/components/color-slider/gradient/ColorSliderGradient.tsx`
- Test: existing `packages/react/src/components/color-slider/gradient/ColorSliderGradient.test.tsx` and `packages/react/src/cssGradient.test.tsx`

**Interfaces:**
- Consumes: same three shared exports.
- Produces: no API change.

- [ ] **Step 1: Read the file and locate the equivalents**

Run: `grep -n "AUTO_STEPS\|INTERPOLATION_STEPS\|withOverrides\|buildAutoColors\|resolveStops\|canvasOpacity" packages/react/src/components/color-slider/gradient/ColorSliderGradient.tsx`
Expected: the same six names as the Svelte file. If a name differs, the React equivalent is the function with the same body; match by behaviour, not by name.

- [ ] **Step 2: Confirm the existing tests cover the output**

Run: `bun test packages/react/src/components/color-slider/gradient/ packages/react/src/cssGradient.test.tsx`
Expected: PASS. These are the regression guard for this task; record the passing count before changing anything.

- [ ] **Step 3: Replace the local implementations**

Delete the local `AUTO_STEPS`, `INTERPOLATION_STEPS`, `withOverrides`, `buildAutoColors` and `resolveStops`, and rewrite the remaining call sites against the shared functions:

```tsx
const canvasOpacity = useMemo(
  () => gradientOpacity(color, channel, channelOverrides),
  [color, channel, channelOverrides],
);

const resolveStops = useCallback((steps: number) => sliderStops({
  color,
  colorSpace,
  channel,
  colors: colorsProp,
  channelOverrides,
  interpolationSpace,
  steps,
  mirrored,
}), [color, colorSpace, channel, colorsProp, channelOverrides, interpolationSpace, mirrored]);
```

Take `color`, `colorSpace`, `channel`, `orientation` and `inverted` from `useColorSliderContext()`, which is how the file already reads them.

- [ ] **Step 4: Verify**

Run: `bun test packages/react/ && bun run lint`
Expected: the same passing count as step 2, plus a clean lint.

- [ ] **Step 5: Commit**

```bash
git add packages/react/src/components/color-slider/gradient/ColorSliderGradient.tsx
git commit -m "refactor(react): use the shared slider gradient stops"
```

---

### Task 4: Refactor the Vue slider gradient

**Files:**
- Modify: `packages/vue/src/components/ColorSlider/ColorSliderGradient.vue`

**Interfaces:**
- Consumes: same three shared exports.
- Produces: no API change.

- [ ] **Step 1: Locate the equivalents**

Run: `grep -n "AUTO_STEPS\|INTERPOLATION_STEPS\|withOverrides\|buildAutoColors\|resolveStops\|canvasOpacity" packages/vue/src/components/ColorSlider/ColorSliderGradient.vue`

- [ ] **Step 2: Replace with computeds**

Delete the local implementations and write:

```vue
const canvasOpacity = computed(
  () => gradientOpacity(context.color.value, context.channel.value, props.channelOverrides),
);

function resolveStops(steps: number) {
  return sliderStops({
    color: context.color.value,
    colorSpace: context.colorSpace.value,
    channel: context.channel.value,
    colors: props.colors,
    channelOverrides: props.channelOverrides,
    interpolationSpace: props.interpolationSpace,
    steps,
    mirrored: context.inverted.value,
  });
}
```

Adjust `.value` to match how the file already unwraps its injected context: if it destructures with `toRefs` or reads plain values, follow that, do not change the file's style.

- [ ] **Step 3: Verify**

Run: `bun test && bun run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add packages/vue/src/components/ColorSlider/ColorSliderGradient.vue
git commit -m "refactor(vue): use the shared slider gradient stops"
```

---

### Task 5: Refactor the Angular slider gradient

**Files:**
- Modify: `packages/angular/src/components/color-slider/gradient/color-slider-gradient.ts`

**Interfaces:**
- Consumes: same three shared exports.
- Produces: no API change.

- [ ] **Step 1: Locate the equivalents**

Run: `grep -n "AUTO_STEPS\|INTERPOLATION_STEPS\|withOverrides\|buildAutoColors\|resolveStops\|canvasOpacity" packages/angular/src/components/color-slider/gradient/color-slider-gradient.ts`

- [ ] **Step 2: Replace with computed signals**

Delete the local implementations and write:

```ts
readonly canvasOpacity = computed(
  () => gradientOpacity(this.root.color(), this.root.channel(), this.channelOverrides()),
);

private resolveStops(steps: number) {
  return sliderStops({
    color: this.root.color(),
    colorSpace: this.root.colorSpace(),
    channel: this.root.channel(),
    colors: this.colors(),
    channelOverrides: this.channelOverrides(),
    interpolationSpace: this.interpolationSpace(),
    steps,
    mirrored: this.root.inverted(),
  });
}
```

Match the file's existing accessor names for the root store; `this.root` is a placeholder for whatever it already injects.

- [ ] **Step 3: Verify**

Run: `bun run --cwd packages/angular check && bun test && bun run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add packages/angular/src/components/color-slider/gradient/color-slider-gradient.ts
git commit -m "refactor(angular): use the shared slider gradient stops"
```

---

### Task 6: Verify no behaviour drifted

**Files:** none modified.

- [ ] **Step 1: Full test run**

Run: `bun test`
Expected: PASS, with 13 more tests than before Task 1.

- [ ] **Step 2: Full build**

Run: `bun run build`
Expected: every package builds.

- [ ] **Step 3: Confirm the duplication is gone**

Run: `grep -rn "buildAutoColors" packages/`
Expected: no output.

- [ ] **Step 4: Docs build**

Run: `bun run docs:build`
Expected: no errors. The Vue and React demo pages render every slider gradient, so a visual regression shows up here as a build error or a thrown component.

---

## Self-Review

**Spec coverage.** The spec says "No new logic lands in `shared` unless a port finds a genuine gap; if one does, it lands in `shared` rather than in the port." This plan is that clause being exercised before the ports rather than after: `buildAutoColors` and `resolveStops` exist identically in all four packages today, confirmed by `grep -rln "buildAutoColors|resolveStops"` matching one file per framework.

**Why this runs before the ports.** Each framework package carries roughly 1,100 lines of gradient code. Without this, Lit, Solid and Ember each add another copy, and a bug in stop resolution then needs seven fixes.

**Scope deliberately limited.** Slider only. Area, wheel, ring and triangle gradients need the same treatment and get their own plan; doing all five families here would make one unreviewable change and would block the ports longer than it saves them.

**Risk.** Vue's and Angular's gradient components were not read while writing this plan, only grepped. Tasks 4 and 5 therefore instruct the implementer to match the existing accessor style rather than assuming it, and both end with the full test and lint run.

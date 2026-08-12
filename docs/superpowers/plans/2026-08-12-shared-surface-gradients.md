# Lift the Surface Gradients Into @urcolor/shared Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the area, wheel, ring and triangle gradient paint logic into `@urcolor/shared`, so the three remaining ports consume it instead of adding a fifth, sixth and seventh copy.

**Architecture:** `@urcolor/shared` already owns the samplers (`sampleBilinearGrid`, `sampleChannelGrid`, `samplePolarGrid`, `sampleConicRing`, `sampleTriangleGrid`), the painters (`drawGradient`, `renderToCanvas`) and the CSS recipes (`cssAreaBilinear`, `cssAreaChannels`, `cssWheelPolar`, `cssConicStops`). What is duplicated is the *orchestration* above them: applying channel overrides, choosing a paint path, and computing the surface opacity. That orchestration moves into a new `surface-gradients.ts`, leaving each framework's gradient component with only its element tree and canvas lifecycle.

**Tech Stack:** TypeScript, `@urcolor/core`, `bun test`.

## Global Constraints

- **Prerequisite:** `2026-08-11-shared-gradient-stops.md` complete, which is where `applyChannelOverrides` and `gradientOpacity` already live.
- Rendered output must not change: same pixels, same CSS layers, same canvas-vs-CSS decision.
- `@urcolor/shared` stays framework-agnostic. `renderToCanvas` and `drawGradient` already take a canvas and are the only DOM-touching exports; this module adds none beyond passing a canvas through.
- **Extraction source of truth:** the Svelte components under `packages/svelte/src/lib/components/color-*/gradient/`. Where this plan and those files disagree, the files win.
- Every existing test must keep passing, and `bun run build` and `bun run docs:build` must stay green after each task.

---

## What is actually duplicated

Per family, per framework, the gradient component holds:

| Piece | Families | Already in shared? |
| --- | --- | --- |
| `withOverrides(base)` | all four | **Yes** — `applyChannelOverrides`, unused by these four |
| `canvasOpacity` | area, triangle | Partly — `gradientOpacity` lacks the alpha-*axis* case |
| `paint(canvas)` path choice | all four | No |
| `cornerColors`, `paintCorners`, `paintChannelGrid`, `paintAlphaAxisGrid`, `orientedCorners` | area only | No |
| CSS layer build | all four | The recipes yes, the choosing no |

So `withOverrides` alone is 16 copies of a function that already exists in `shared`. Area is the only family with real logic; wheel, ring and triangle each have a single `paint` plus a CSS-layer choice.

---

## File Structure

**Created:**

| File | Responsibility |
| --- | --- |
| `packages/shared/src/surface-gradients.ts` | Paint-path orchestration for the four 2D families |
| `packages/shared/src/surface-gradients.test.ts` | Unit tests |

**Modified:** `packages/shared/src/index.ts`, and 16 gradient components across Vue, React, Svelte and Angular.

---

### Task 1: Surface opacity and the area paint path

**Files:**
- Create: `packages/shared/src/surface-gradients.ts`
- Test: `packages/shared/src/surface-gradients.test.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Consumes: `applyChannelOverrides`, `ChannelOverrides` from `./gradient-stops`; `getChannelConfig` from `./color-spaces`; `sampleBilinearGrid`, `sampleChannelGrid`, `drawGradient` from `./gradient`; `renderToCanvas` from `./canvas`.
- Produces:
  - `const SURFACE_GRID = 64`
  - `function surfaceOpacity(color: Color, hasAlphaAxis: boolean, overrides: ChannelOverrides): number`
  - `interface AreaAxes { colorSpace: SpaceId; xChannel: string; yChannel: string; slidingFromLeft: boolean; slidingFromTop: boolean; }`
  - `interface AreaPaintOptions extends AreaAxes { canvas: HTMLCanvasElement; color: Color; overrides: ChannelOverrides; corners?: [string, string, string, string]; interpolationSpace?: SpaceId; }`
  - `function paintAreaSurface(options: AreaPaintOptions): void`

`surfaceOpacity` is `gradientOpacity` generalised: an area whose x or y axis *is* alpha paints its own transparency, exactly as an alpha slider does, but the condition is an axis flag rather than a channel name.

- [ ] **Step 1: Write the failing test**

Create `packages/shared/src/surface-gradients.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { Color } from "@urcolor/core";
import { surfaceOpacity, SURFACE_GRID, paintAreaSurface } from "./surface-gradients";

const BASE = Color.parse("hsl(210, 80%, 50%)")!;

/** A canvas stub: the paint functions only need a 2D context to blit into. */
function fakeCanvas() {
  const calls: { width: number; height: number }[] = [];
  return {
    calls,
    canvas: {
      width: 0,
      height: 0,
      clientWidth: 64,
      clientHeight: 64,
      getContext: (kind: string) => (kind === "2d"
        ? {
            createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
            putImageData: () => { calls.push({ width: 1, height: 1 }); },
            drawImage: () => { calls.push({ width: 2, height: 2 }); },
            clearRect: () => {},
            canvas: { width: 64, height: 64 },
          }
        : null),
    } as unknown as HTMLCanvasElement,
  };
}

describe("surfaceOpacity", () => {
  test("is 1 when an axis is alpha", () => {
    expect(surfaceOpacity(BASE.withAlpha(0.3), true, { alpha: 1 })).toBe(1);
  });

  test("is 1 when alpha is locked by an override", () => {
    expect(surfaceOpacity(BASE.withAlpha(0.3), false, { alpha: 1 })).toBe(1);
  });

  test("follows the color's alpha when nothing locks it", () => {
    expect(surfaceOpacity(BASE.withAlpha(0.3), false, false)).toBeCloseTo(0.3, 5);
  });
});

describe("paintAreaSurface", () => {
  test("paints a two-channel grid", () => {
    const { canvas, calls } = fakeCanvas();
    paintAreaSurface({
      canvas,
      color: BASE,
      colorSpace: "hsv",
      xChannel: "s",
      yChannel: "v",
      slidingFromLeft: true,
      slidingFromTop: true,
      overrides: { alpha: 1 },
    });
    expect(calls.length).toBeGreaterThan(0);
  });

  test("does nothing when both axes are alpha", () => {
    const { canvas, calls } = fakeCanvas();
    paintAreaSurface({
      canvas,
      color: BASE,
      colorSpace: "hsv",
      xChannel: "alpha",
      yChannel: "alpha",
      slidingFromLeft: true,
      slidingFromTop: true,
      overrides: false,
    });
    expect(calls.length).toBe(0);
  });

  test("paints an alpha axis against the remaining channel", () => {
    const { canvas, calls } = fakeCanvas();
    paintAreaSurface({
      canvas,
      color: BASE,
      colorSpace: "hsv",
      xChannel: "s",
      yChannel: "alpha",
      slidingFromLeft: true,
      slidingFromTop: true,
      overrides: false,
    });
    expect(calls.length).toBeGreaterThan(0);
  });

  test("uses the grid constant for its sample resolution", () => {
    expect(SURFACE_GRID).toBe(64);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/shared/src/surface-gradients.test.ts`
Expected: FAIL, cannot resolve `./surface-gradients`.

- [ ] **Step 3: Write the module**

Create `packages/shared/src/surface-gradients.ts`, translating `packages/svelte/src/lib/components/color-area/gradient/ColorAreaGradient.svelte` lines 85-215. Reproduce these behaviours exactly, each of which the source comments explain:

- `paintCorners` has two paths. Without an `interpolationSpace` it calls `drawGradient`, whose shader mirrors internally, so the corners pass through as authored and the mirror flags are `!slidingFromLeft` / `!slidingFromTop`. With one it calls `sampleBilinearGrid`, which has no mirror flags, so the corners are swapped instead: `[a,b,c,d] = [b,a,d,c]` horizontally and `[c,d,a,b]` vertically.
- `paintChannelGrid` passes the axis bounds in visual order: `slidingFromLeft ? xMin : xMax` for the start and the reverse for the end, per axis.
- `paintAlphaAxisGrid` exists because the core samplers take two real channels and an alpha axis leaves only one. It builds the pixel array directly, converting each sample `.to("srgb")` and clamping each component to 0-1 before scaling to 255.
- Both axes being alpha leaves no channel to sample, so `paintAreaSurface` returns without painting.

Read the source before writing; do not reconstruct it from this summary alone.

- [ ] **Step 4: Export from the barrel**

In `packages/shared/src/index.ts`, add after the `./gradient-stops` line:

```ts
export * from "./surface-gradients";
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test packages/shared/src/surface-gradients.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/surface-gradients.ts packages/shared/src/surface-gradients.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): lift the area gradient paint paths out of the packages"
```

---

### Task 2: Wheel, ring and triangle paint paths

**Files:**
- Modify: `packages/shared/src/surface-gradients.ts`
- Modify: `packages/shared/src/surface-gradients.test.ts`

**Interfaces:**
- Produces:
  - `function paintWheelSurface(options: { canvas: HTMLCanvasElement; color: Color; colorSpace: SpaceId; angleChannel: string; radiusChannel: string; startAngle: number; overrides: ChannelOverrides; interpolationSpace?: SpaceId; }): void`
  - `function paintRingSurface(options: { canvas: HTMLCanvasElement; color: Color; colorSpace: SpaceId; channel: string; startAngle: number; innerRadius: number; overrides: ChannelOverrides; }): void`
  - `function paintTriangleSurface(options: { canvas: HTMLCanvasElement; color: Color; colorSpace: SpaceId; xChannel: string; yChannel: string; zChannel?: string; vertices: readonly [Point, Point, Point]; overrides: ChannelOverrides; }): void`

- [ ] **Step 1: Read the three sources**

Run:

```bash
sed -n '1,200p' packages/svelte/src/lib/components/color-wheel/gradient/ColorWheelGradient.svelte
sed -n '1,200p' packages/svelte/src/lib/components/color-ring/gradient/ColorRingGradient.svelte
sed -n '1,200p' packages/svelte/src/lib/components/color-triangle/gradient/ColorTriangleGradient.svelte
```

Each has a single `paint` function over `samplePolarGrid`, `sampleConicRing` and `sampleTriangleGrid` respectively, plus `withOverrides`, which `applyChannelOverrides` replaces.

- [ ] **Step 2: Write the failing tests**

Add one `describe` per function to `surface-gradients.test.ts`, each mounting the `fakeCanvas()` stub from Task 1 and asserting that a paint call reached the context. Follow the shape of the `paintAreaSurface` tests.

- [ ] **Step 3: Run them and watch them fail**

Run: `bun test packages/shared/src/surface-gradients.test.ts`
Expected: FAIL on the three new functions.

- [ ] **Step 4: Write the three functions**

Each is the Svelte `paint` body with `context.*` reads replaced by parameters and `withOverrides(...)` replaced by `applyChannelOverrides(color, colorSpace, overrides)`.

- [ ] **Step 5: Verify**

Run: `bun test packages/shared/`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/surface-gradients.ts packages/shared/src/surface-gradients.test.ts
git commit -m "feat(shared): lift the wheel, ring and triangle paint paths"
```

---

### Tasks 3-6: Refactor the four framework packages

One task per framework, Svelte first because it is the extraction source: if the shared module and the component disagree, the component is right.

Each task follows the same five steps:

1. Record the regression baseline: `bun test packages/<fw>/` and note the passing count.
2. In each of the four gradient components, delete `withOverrides`, the local `paint` helpers and the local `canvasOpacity` body.
3. Rewrite the remaining call sites against `surfaceOpacity`, `paintAreaSurface`, `paintWheelSurface`, `paintRingSurface` and `paintTriangleSurface`, keeping each framework's own reactive idiom for the wrappers.
4. Run that package's typecheck, lint and tests; the passing count must match step 1.
5. Commit as `refactor(<fw>): use the shared surface gradients`.

Per framework, the four files are:

- **Task 3, Svelte:** `packages/svelte/src/lib/components/color-{area,wheel,ring,triangle}/gradient/*.svelte`. Verify with `bun run --cwd packages/svelte check`.
- **Task 4, React:** `packages/react/src/components/color-{area,wheel,ring,triangle}/gradient/*.tsx`. Verify with `bun x tsc -p packages/react/tsconfig.json --noEmit`.
- **Task 5, Vue:** `packages/vue/src/components/Color{Area,Wheel,Ring,Triangle}/Color*Gradient.vue`. Verify with `bun x vue-tsc --noEmit`, ignoring the pre-existing `docs/how-to/demo/angular/**` and `packages/shared/test/geometry.test.ts` errors. Vue's own `applyChannelOverrides` in `packages/vue/src/shared/useGradientCanvas.ts` is already a re-export of the shared one, so the four components can import it from either path; prefer `@urcolor/shared` directly and leave the re-export for anything else still using it.
- **Task 6, Angular:** `packages/angular/src/components/color-{area,wheel,ring,triangle}/gradient/*.ts`. Verify with `bun run --cwd packages/angular check`.

---

### Task 7: Verify nothing drifted

- [ ] **Step 1: Full test run**

Run: `bun test`
Expected: PASS, with the new shared tests added and no framework test lost.

- [ ] **Step 2: Confirm the duplication is gone**

Run: `grep -rn "function withOverrides" packages/*/src packages/svelte/src`
Expected: no output.

- [ ] **Step 3: Full build and docs**

Run: `bun run build && bun run docs:build`
Expected: both clean. The Vue and React demo pages render every gradient, so a visual regression surfaces here as a thrown component.

---

## Self-Review

**Spec coverage.** This is the follow-up `2026-08-11-shared-gradient-stops.md` named in its own scope note: "Area, wheel, ring and triangle gradients need the same treatment and get their own plan." It exists because Plan 4 (Lit) reached the ColorArea gradient and would otherwise have written a fifth copy, with Solid and Ember to follow.

**Why the payoff is larger than it looks.** `withOverrides` alone is 16 identical copies of a function already exported from `shared`. The samplers and CSS recipes are already shared, so what moves is orchestration, and area is the only family with substantial logic.

**Risk.** The area gradient's two `paintCorners` paths differ in how they mirror — the GPU path passes flags, the CPU path swaps the corners — and getting that backwards produces a picture that is wrong only when `xInverted` or `yInverted` is set, which no existing test covers. Task 1 step 3 calls this out explicitly, and the docs build in Task 7 is the visual backstop.

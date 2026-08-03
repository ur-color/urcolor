# Core / Shared Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip every rendering and picker-UI concern out of `@urcolor/core` so it is a pure color library, moving all three UI modules into `@urcolor/primitives`, which is renamed `@urcolor/shared` in the same change.

**Architecture:** `@urcolor/core` keeps `src/color/**` only. `@urcolor/shared` (renamed from `@urcolor/primitives`) absorbs `gradient.ts`, `geometry.ts` and `color-spaces.ts` alongside the picker behavior it already owns. Every framework binding already depends on both packages, so consumer changes are import-line retargets, not new dependency edges. The three modules move one at a time, in an order that never leaves `@urcolor/core` importing from `@urcolor/shared` at runtime.

**Tech Stack:** Bun workspaces, TypeScript, `bun test`, ESLint + `vue-tsc` + `svelte-check` + Angular `ngtsc`, VitePress docs, mitata benchmarks.

**Spec:** `docs/superpowers/specs/2026-08-03-core-shared-split-design.md`

## Global Constraints

- Every file relocation uses `git mv`, never delete-and-recreate. History must follow the code.
- No back-compat re-export shims in `@urcolor/core`. Removed exports stay removed.
- Moved module bodies change **only** their import lines. No refactoring, no renaming, no reformatting of the code inside.
- `@urcolor/core` must never import `@urcolor/shared` in `dependencies`. The single permitted edge is a `devDependencies` entry used by `packages/core/bench/gradient.bench.ts`.
- Every task ends on a green `bun test`. The tree is never committed broken.
- **The verification gate is delta-based, not absolute.** `bun run lint` is red on this repo's base commit and is not run by CI: `eslint` crashes outright on `docs/how-to/demo/svelte/ColorFieldGuide.svelte` (typed-linting misconfiguration, `svelte-eslint-parser` does not forward `parserOptions.project`), and reports 230 pre-existing problems across `packages/` and `scripts/`. `vue-tsc --noEmit` reports 44 pre-existing errors at base `d2faaab`, mostly `@angular/core` resolution failures in `docs/how-to/demo/angular/`. Fixing those is out of scope.
  Where a task says "run the gate", run:

  ```bash
  bun test
  bun run --cwd packages/svelte check     # must be 0 errors — clean at base
  bun run --cwd packages/angular check    # must be 0 errors — clean at base
  bunx vue-tsc --noEmit 2>&1 | grep -c "error TS"   # must not exceed the baseline below
  bun run build
  ```

  Baselines measured at `d2faaab`: `vue-tsc` **44** errors, `eslint packages scripts` **230** problems. A task passes when `bun test` and `bun run build` are green, svelte-check and the Angular check report zero, and the `vue-tsc` count has not risen. Report the count in your task report either way. Do not attempt to make `bun run lint` exit zero.
- Package versions after the change: `@urcolor/core` **2.0.0**, `@urcolor/shared` **1.0.0**, `urcolor` **2.0.0**, `@urcolor/vue` **2.0.0**, `@urcolor/react` **2.0.0**, `@urcolor/svelte` **2.0.0**, `@urcolor/angular` **2.0.0**, `@urcolor/relative` **2.0.0**, `@urcolor/i18n` **2.0.0**.
- Dependency ranges after the change: anything depending on core uses `"@urcolor/core": "^2.0.0"` when published, `"workspace:*"` in-repo. Framework packages add `"@urcolor/shared": "workspace:*"` in place of `"@urcolor/primitives": "workspace:*"`.
- The npm deprecation of `@urcolor/primitives` is a release-time action and is **not** part of this plan.

### Symbol Sets

These three sets are referenced by name throughout the plan.

**GRADIENT** — `drawGradient`, `drawLinearGradient`, `interpolateStops`, `sampleBilinearGrid`, `sampleChannelGrid`, `sampleTriangleGrid`, `samplePolarGrid`, `sampleConicRing`

**GEOMETRY** — `polarToCartesian`, `cartesianToPolar`, `clampToCircle`, `normalizeAngle`, `triangleVertices`, `barycentricCoords`, `barycentricToCartesian`, `pointInTriangle`, `clampToTriangle`, `insetTriangle`, `Point`, `PolarCoord`

**SPACE-CONFIG** — `colorSpaces`, `getChannelConfig`, `displayToNative`, `nativeToDisplay`, `ChannelConfig`, `ColorSpaceConfig`

### The Mixed-Import Rule

Most consumer files import a mix of moving and staying symbols on one line:

```ts
import { Color, getChannelConfig, samplePolarGrid } from "@urcolor/core";
```

Never rewrite the whole line to `@urcolor/shared` — `Color` stays in core. Split it:

```ts
import { Color } from "@urcolor/core";
import { getChannelConfig, samplePolarGrid } from "@urcolor/shared";
```

If **every** named import on the line is moving, rewrite the specifier in place and do not split. If the line has a `type` modifier on individual names (`import { Color, type ChannelConfig }`), carry the modifier onto whichever line the name lands on. ESLint enforces import ordering — run `bun run lint:fix` after a batch of edits and let it sort the specifiers.

---

## Task 1: Rename `@urcolor/primitives` to `@urcolor/shared`

Pure rename. No module moves, no behavior change. Doing it first means every later task writes the final package name once.

**Files:**
- Move: `packages/primitives/` → `packages/shared/`
- Modify: `packages/shared/package.json` (name, build:js external)
- Modify: `packages/shared/tsconfig.build.json` (unchanged content, moves with the directory)
- Modify: `packages/{vue,react,svelte,angular}/package.json` (dependency key)
- Modify: `packages/vue/vite.config.ts:16`, `packages/react/vite.config.ts:14` (rollup externals)
- Modify: `packages/angular/ng-package.json:7` (`allowedNonPeerDependencies`)
- Modify: every `.ts`/`.tsx`/`.vue`/`.svelte` file importing `@urcolor/primitives`
- Modify: `package.json` (root `build` script)
- Modify: `scripts/check-publishable.test.ts` (fixture string)

**Interfaces:**
- Consumes: nothing.
- Produces: the package specifier `@urcolor/shared` and the directory `packages/shared/`. Every later task uses both.

- [ ] **Step 1: Move the directory**

```bash
git mv packages/primitives packages/shared
```

- [ ] **Step 2: Rename the package**

In `packages/shared/package.json`, change:

```json
  "name": "@urcolor/primitives",
```

to:

```json
  "name": "@urcolor/shared",
```

and in the same file update the repository directory:

```json
    "directory": "packages/primitives"
```

to:

```json
    "directory": "packages/shared"
```

- [ ] **Step 3: Retarget every import of the old specifier**

Find them:

```bash
grep -rl "@urcolor/primitives" \
  --include="*.ts" --include="*.tsx" --include="*.vue" --include="*.svelte" \
  --include="*.json" --include="*.js" \
  packages docs scripts package.json \
  | grep -v node_modules | grep -v "/dist/" | grep -v ".svelte-kit"
```

Replace `@urcolor/primitives` with `@urcolor/shared` in every hit. This is a whole-string replacement with no split logic — the Mixed-Import Rule does not apply, because nothing is moving between packages yet.

Hits span: `packages/svelte/src/lib/**` (~30 component and hook files), `packages/vue/src/shared/{channel-labels,utils,useGradientCanvas}.ts`, `packages/react/src/utils.ts` and its gradient/thumb components, `packages/angular/src/**`, the four framework `package.json` files, `packages/vue/vite.config.ts`, `packages/react/vite.config.ts`, `packages/angular/ng-package.json`, and `scripts/check-publishable.test.ts`.

Do **not** rewrite `docs/superpowers/specs/**` or `docs/superpowers/plans/**` — those are historical records of past work. The 2026-08-02 spec and plan describe `@urcolor/primitives` as it was, and rewriting them falsifies the record.

- [ ] **Step 4: Update the root build script**

In `package.json`, the `build` script currently reads:

```
bun run --cwd packages/core build && bun run --cwd packages/urcolor build && bun run --cwd packages/primitives build && bun run --cwd packages/relative build && bun run --cwd packages/i18n build && bun run --cwd packages/vue build && bun run --cwd packages/react build && bun run --cwd packages/svelte build && bun run --cwd packages/angular build
```

Change `packages/primitives` to `packages/shared`. Order is otherwise unchanged.

- [ ] **Step 5: Relink the workspace and clear stale output**

```bash
rm -rf packages/core/dist packages/shared/dist node_modules/@urcolor
bun install
```

Removing `node_modules/@urcolor` drops the dangling `primitives` symlink; `bun install` recreates the directory with a `shared` link. Removing the `dist` directories stops a stale `.d.ts` from satisfying an import that should now fail.

- [ ] **Step 6: Verify nothing references the old name**

```bash
grep -rn "@urcolor/primitives" \
  --include="*.ts" --include="*.tsx" --include="*.vue" --include="*.svelte" --include="*.json" \
  packages docs scripts package.json \
  | grep -v node_modules | grep -v "/dist/" | grep -v ".svelte-kit" | grep -v "docs/superpowers"
```

Expected: no output.

- [ ] **Step 7: Run the full gate**

```bash
bun test && bun run lint && bun run build
```

Expected: all pass. Nothing moved between packages yet, so any failure here is a missed rename.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: rename @urcolor/primitives to @urcolor/shared"
```

---

## Task 2: Export `channelIndexOf` from core

`gradient.ts` calls `channelIndexOf` from `src/color/registry.ts`. It is exported from its module but not from `src/index.ts`, so gradient cannot resolve it once it lives outside core. This task makes it public — an addition, not a break.

**Files:**
- Modify: `packages/core/src/index.ts:17`
- Test: `packages/core/test/exports.test.ts:31`

**Interfaces:**
- Consumes: nothing.
- Produces: `channelIndexOf(space: SpaceId, channel: string): number` on the `@urcolor/core` public surface. Returns the index of `channel` within `space`'s coordinate tuple, or `-1` when the space has no such channel. Task 3's relocated `gradient.ts` imports it.

- [ ] **Step 1: Write the failing test**

In `packages/core/test/exports.test.ts`, add `"channelIndexOf"` to the name list in the `"exposes the color library"` block, immediately after `"hueIndexOf"`:

```ts
      "SPACES",
      "spaceDef",
      "hueIndexOf",
      "channelIndexOf",
    ]) {
      expect(core).toHaveProperty(name);
    }
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun test packages/core/test/exports.test.ts
```

Expected: FAIL — `expect(received).toHaveProperty("channelIndexOf")`.

- [ ] **Step 3: Add the export**

In `packages/core/src/index.ts`, change:

```ts
export { SPACES, spaceDef, hueIndexOf } from "./color/registry";
```

to:

```ts
export { SPACES, spaceDef, hueIndexOf, channelIndexOf } from "./color/registry";
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
bun test packages/core/test/exports.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/index.ts packages/core/test/exports.test.ts
git commit -m "feat(core): export channelIndexOf"
```

---

## Task 3: Move `gradient.ts` to shared

Gradient moves first. It imports `barycentricCoords` and `Point` from `./geometry`, which is still in core at this point — so the relocated module reaches them through `@urcolor/core`'s public surface. Moving geometry first instead would force core to import from shared, which is the cycle the ordering exists to avoid.

**Files:**
- Move: `packages/core/src/gradient.ts` → `packages/shared/src/gradient.ts`
- Move: `packages/core/test/gradient.test.ts` → `packages/shared/test/gradient.test.ts`
- Move: `packages/core/test/gradient-samplers.test.ts` → `packages/shared/test/gradient-samplers.test.ts`
- Modify: `packages/shared/src/gradient.ts` (import lines 1–6 only)
- Modify: `packages/shared/src/index.ts` (add export)
- Modify: `packages/core/src/index.ts` (drop the gradient export line)
- Modify: `packages/core/package.json` (add `@urcolor/shared` devDependency)
- Modify: `packages/core/bench/gradient.bench.ts` (import specifier)
- Modify: `packages/core/test/exports.test.ts` (drop gradient names)
- Modify: the 20 framework consumer files listed in Step 6

**Interfaces:**
- Consumes: `channelIndexOf` from Task 2; the specifier `@urcolor/shared` from Task 1.
- Produces: all eight GRADIENT symbols on `@urcolor/shared`. Signatures are unchanged from their current core definitions — the module body is not edited.

- [ ] **Step 1: Move the module and its tests**

```bash
git mv packages/core/src/gradient.ts packages/shared/src/gradient.ts
git mv packages/core/test/gradient.test.ts packages/shared/test/gradient.test.ts
git mv packages/core/test/gradient-samplers.test.ts packages/shared/test/gradient-samplers.test.ts
```

- [ ] **Step 2: Rewrite the relocated module's imports**

`packages/shared/src/gradient.ts` lines 1–6 currently read:

```ts
import { Color } from "./color/color";
import { convert } from "./color/convert";
import { interpolate } from "./color/interpolate";
import { channelIndexOf } from "./color/registry";
import type { ColorObject, Coords, SpaceId } from "./color/types";
import { barycentricCoords, type Point } from "./geometry";
```

Replace all six with:

```ts
import { barycentricCoords, channelIndexOf, Color, convert, interpolate, type ColorObject, type Coords, type Point, type SpaceId } from "@urcolor/core";
```

Nothing below line 6 changes.

- [ ] **Step 3: Rewrite the relocated tests' imports**

In `packages/shared/test/gradient.test.ts`, line 2 reads `import { Color } from "../src/color/color";`. Change it to:

```ts
import { Color } from "@urcolor/core";
```

In `packages/shared/test/gradient-samplers.test.ts`, lines 12–13 read:

```ts
import { Color } from "../src/color/color";
import type { SpaceId } from "../src/color/types";
```

Change them to:

```ts
import { Color, type SpaceId } from "@urcolor/core";
```

In both files the `from "../src/gradient"` import is already correct — the module travelled with the test.

- [ ] **Step 4: Export gradient from shared**

Append to `packages/shared/src/index.ts`:

```ts
export * from "./gradient";
```

- [ ] **Step 5: Drop gradient from core's surface**

Delete these two lines from `packages/core/src/index.ts`:

```ts
// Gradient rendering.
export { drawGradient, drawLinearGradient, interpolateStops, sampleBilinearGrid, sampleChannelGrid, sampleTriangleGrid, samplePolarGrid, sampleConicRing } from "./gradient";
```

In `packages/core/test/exports.test.ts`, the block titled `"still exposes the gradient, geometry and space-config surface"` lists five names. Delete `"drawGradient"` and `"sampleChannelGrid"`, leaving:

```ts
  it("still exposes the geometry and space-config surface", () => {
    for (const name of [
      "polarToCartesian",
      "colorSpaces",
      "getChannelConfig",
    ]) {
      expect(core).toHaveProperty(name);
    }
  });
```

- [ ] **Step 6: Retarget the framework consumers**

Apply the Mixed-Import Rule to every GRADIENT symbol in these 20 files:

```
packages/angular/src/components/color-area/gradient/color-area-gradient.ts
packages/angular/src/components/color-ring/gradient/color-ring-gradient.ts
packages/angular/src/components/color-slider/gradient/color-slider-gradient.ts
packages/angular/src/components/color-triangle/gradient/color-triangle-gradient.ts
packages/angular/src/components/color-wheel/gradient/color-wheel-gradient.ts
packages/react/src/components/color-area/gradient/ColorAreaGradient.tsx
packages/react/src/components/color-ring/gradient/ColorRingGradient.tsx
packages/react/src/components/color-slider/gradient/ColorSliderGradient.tsx
packages/react/src/components/color-triangle/gradient/ColorTriangleGradient.tsx
packages/react/src/components/color-wheel/gradient/ColorWheelGradient.tsx
packages/svelte/src/lib/components/color-area/gradient/ColorAreaGradient.svelte
packages/svelte/src/lib/components/color-ring/gradient/ColorRingGradient.svelte
packages/svelte/src/lib/components/color-slider/gradient/ColorSliderGradient.svelte
packages/svelte/src/lib/components/color-triangle/gradient/ColorTriangleGradient.svelte
packages/svelte/src/lib/components/color-wheel/gradient/ColorWheelGradient.svelte
packages/vue/src/components/ColorArea/ColorAreaGradient.vue
packages/vue/src/components/ColorRing/ColorRingGradient.vue
packages/vue/src/components/ColorSlider/ColorSliderGradient.vue
packages/vue/src/components/ColorTriangle/ColorTriangleGradient.vue
packages/vue/src/components/ColorWheel/ColorWheelGradient.vue
packages/vue/src/shared/useGradientCanvas.ts
```

Worked example — `packages/vue/src/components/ColorSlider/ColorSliderGradient.vue` currently has:

```ts
import { Color, drawLinearGradient, getChannelConfig, interpolateStops } from "@urcolor/core";
```

`Color` and `getChannelConfig` both still live in core at this point (space-config moves in Task 4), so only the two GRADIENT names split out:

```ts
import { Color, getChannelConfig } from "@urcolor/core";
import { drawLinearGradient, interpolateStops } from "@urcolor/shared";
```

Several of these files already import from `@urcolor/shared` — merge the moved names into that existing line rather than adding a second one.

- [ ] **Step 7: Point the benchmark at shared**

Add to `packages/core/package.json` `devDependencies`, keeping the block alphabetical:

```json
    "@urcolor/shared": "workspace:*",
```

In `packages/core/bench/gradient.bench.ts`, the import block starting at line 22 pulls `interpolateStops`, `sampleBilinearGrid`, `sampleChannelGrid` and the other samplers from `"../src/gradient"`. Change that specifier to `"@urcolor/shared"`. Leave the competitor imports (culori, chroma-js, colorjs.io) untouched.

This devDependency is the one permitted core→shared edge. It never reaches the published tarball: `files` is `["dist"]` and `bench/` is not bundled.

- [ ] **Step 8: Reinstall and run the gate**

```bash
rm -rf packages/core/dist packages/shared/dist
bun install
bun test && bun run lint && bun run build
```

Expected: all pass. `bun install` resolves the new devDependency; bun handles the workspace cycle by symlink, so no install error is expected.

- [ ] **Step 9: Verify the boundary held**

```bash
grep -rn "drawGradient\|sampleBilinearGrid\|sampleConicRing" packages/core/src/
```

Expected: no output.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor: move gradient rendering from core to shared"
```

---

## Task 4: Move `color-spaces.ts` to shared

Independent of the other two modules — its only core import is `type SpaceId`. Its largest consumer group is the framework roots and field components.

**Files:**
- Move: `packages/core/src/color-spaces.ts` → `packages/shared/src/color-spaces.ts`
- Move: `packages/core/test/color-spaces.test.ts` → `packages/shared/test/color-spaces.test.ts`
- Modify: `packages/shared/src/color-spaces.ts` (import line 1)
- Modify: `packages/shared/src/index.ts` (add export)
- Modify: `packages/shared/src/channel-model.ts:1-2`, `packages/shared/src/labels.ts:1-2` (core → relative)
- Modify: `packages/core/src/index.ts` (drop the space-config export line)
- Modify: `packages/core/test/exports.test.ts` (drop space-config names)
- Modify: the consumer files listed in Step 6

**Interfaces:**
- Consumes: the specifier `@urcolor/shared` from Task 1.
- Produces: all six SPACE-CONFIG symbols on `@urcolor/shared` — `colorSpaces: Partial<Record<SpaceId, ColorSpaceConfig>>`, `getChannelConfig(colorSpace: SpaceId, channel: string): ChannelConfig | undefined`, `displayToNative(config: ChannelConfig, displayValue: number): number`, `nativeToDisplay(config: ChannelConfig, nativeValue: number): number`, plus the `ChannelConfig` and `ColorSpaceConfig` interfaces.

- [ ] **Step 1: Move the module and its test**

```bash
git mv packages/core/src/color-spaces.ts packages/shared/src/color-spaces.ts
git mv packages/core/test/color-spaces.test.ts packages/shared/test/color-spaces.test.ts
```

- [ ] **Step 2: Rewrite the relocated module's import**

`packages/shared/src/color-spaces.ts` line 1 reads:

```ts
import type { SpaceId } from "./color/types";
```

Change it to:

```ts
import type { SpaceId } from "@urcolor/core";
```

The relocated test imports only from `../src/color-spaces`, which travelled with it — no change needed there.

- [ ] **Step 3: Export it from shared**

Append to `packages/shared/src/index.ts`:

```ts
export * from "./color-spaces";
```

- [ ] **Step 4: Make shared's own consumers use relative imports**

`packages/shared/src/channel-model.ts` lines 1–2 read:

```ts
import type { ChannelConfig, SpaceId } from "@urcolor/core";
import { Color, displayToNative, getChannelConfig, nativeToDisplay } from "@urcolor/core";
```

Change to:

```ts
import { Color, type SpaceId } from "@urcolor/core";
import { displayToNative, getChannelConfig, nativeToDisplay, type ChannelConfig } from "./color-spaces";
```

`packages/shared/src/labels.ts` lines 1–2 read:

```ts
import type { SpaceId } from "@urcolor/core";
import { getChannelConfig } from "@urcolor/core";
```

Change to:

```ts
import type { SpaceId } from "@urcolor/core";
import { getChannelConfig } from "./color-spaces";
```

- [ ] **Step 5: Drop it from core's surface**

Delete these two lines from `packages/core/src/index.ts`:

```ts
// Color-space UI configuration.
export { colorSpaces, getChannelConfig, displayToNative, nativeToDisplay, type ChannelConfig, type ColorSpaceConfig } from "./color-spaces";
```

In `packages/core/test/exports.test.ts`, drop `"colorSpaces"` and `"getChannelConfig"` so the block reads:

```ts
  it("still exposes the geometry surface", () => {
    for (const name of [
      "polarToCartesian",
    ]) {
      expect(core).toHaveProperty(name);
    }
  });
```

- [ ] **Step 6: Retarget the consumers**

Apply the Mixed-Import Rule to every SPACE-CONFIG symbol across these files. Framework packages:

```
packages/angular/src/components/color-area/gradient/color-area-gradient.ts
packages/angular/src/components/color-area/root/color-area-root.ts
packages/angular/src/components/color-field/root/color-field-root.ts
packages/angular/src/components/color-ring/gradient/color-ring-gradient.ts
packages/angular/src/components/color-ring/root/color-ring-root.ts
packages/angular/src/components/color-slider/gradient/color-slider-gradient.ts
packages/angular/src/components/color-slider/root/color-slider-root.ts
packages/angular/src/components/color-triangle/gradient/color-triangle-gradient.ts
packages/angular/src/components/color-triangle/root/color-triangle-root.ts
packages/angular/src/components/color-wheel/gradient/color-wheel-gradient.ts
packages/angular/src/components/color-wheel/root/color-wheel-root.ts
packages/angular/src/services/color-space-store.ts
packages/react/src/components/color-area/gradient/ColorAreaGradient.tsx
packages/react/src/components/color-area/root/ColorAreaRoot.tsx
packages/react/src/components/color-field/root/ColorFieldRoot.tsx
packages/react/src/components/color-ring/gradient/ColorRingGradient.tsx
packages/react/src/components/color-ring/root/ColorRingRoot.tsx
packages/react/src/components/color-slider/gradient/ColorSliderGradient.tsx
packages/react/src/components/color-slider/root/ColorSliderRoot.tsx
packages/react/src/components/color-triangle/gradient/ColorTriangleGradient.tsx
packages/react/src/components/color-triangle/root/ColorTriangleRoot.tsx
packages/react/src/components/color-wheel/gradient/ColorWheelGradient.tsx
packages/react/src/components/color-wheel/root/ColorWheelRoot.tsx
packages/react/src/hooks/useColorSpace.ts
packages/svelte/src/lib/components/color-area/gradient/ColorAreaGradient.svelte
packages/svelte/src/lib/components/color-area/root/ColorAreaRoot.svelte
packages/svelte/src/lib/components/color-field/root/ColorFieldRoot.svelte
packages/svelte/src/lib/components/color-ring/gradient/ColorRingGradient.svelte
packages/svelte/src/lib/components/color-ring/root/ColorRingRoot.svelte
packages/svelte/src/lib/components/color-slider/gradient/ColorSliderGradient.svelte
packages/svelte/src/lib/components/color-slider/root/ColorSliderRoot.svelte
packages/svelte/src/lib/components/color-triangle/gradient/ColorTriangleGradient.svelte
packages/svelte/src/lib/components/color-triangle/root/ColorTriangleRoot.svelte
packages/svelte/src/lib/components/color-wheel/gradient/ColorWheelGradient.svelte
packages/svelte/src/lib/components/color-wheel/root/ColorWheelRoot.svelte
packages/svelte/src/lib/hooks/useColorSpace.svelte.ts
packages/vue/src/components/ColorArea/ColorAreaGradient.vue
packages/vue/src/components/ColorArea/ColorAreaRoot.vue
packages/vue/src/components/ColorField/ColorFieldRoot.vue
packages/vue/src/components/ColorRing/ColorRingGradient.vue
packages/vue/src/components/ColorRing/ColorRingRoot.vue
packages/vue/src/components/ColorSlider/ColorSliderGradient.vue
packages/vue/src/components/ColorTriangle/ColorTriangleGradient.vue
packages/vue/src/components/ColorTriangle/ColorTriangleRoot.vue
packages/vue/src/components/ColorWheel/ColorWheelGradient.vue
packages/vue/src/components/ColorWheel/ColorWheelRoot.vue
packages/vue/src/composables/useColorSpace.ts
packages/vue/src/shared/useColorChannelModel.ts
packages/vue/src/shared/useGradientCanvas.ts
```

Docs demos — these import `colorSpaces` directly from `@urcolor/core` today:

```
docs/components/react/demo/ColorFieldHSL.tsx
docs/components/react/demo/ColorSliderLightness.tsx
docs/components/react/demo/ColorSliderSaturation.tsx
docs/components/vue/demo/ColorFieldHSL.vue
docs/components/vue/demo/ColorSliderLightness.vue
docs/components/vue/demo/ColorSliderSaturation.vue
docs/components/vue/demo/FullPreview.vue
docs/components/vue/demo/FullPreviewOverrides.vue
docs/how-to/demo/angular/color-field-guide.ts
docs/how-to/demo/angular/material-color-picker-guide.ts
docs/how-to/demo/react/ColorFieldGuide.tsx
docs/how-to/demo/react/MaterialColorPickerGuide.tsx
docs/how-to/demo/svelte/ColorFieldGuide.svelte
docs/how-to/demo/svelte/MaterialColorPickerGuide.svelte
docs/how-to/demo/vue/ColorFieldGuide.vue
docs/how-to/demo/vue/MaterialColorPickerGuide.vue
```

Worked example — `docs/how-to/demo/react/ColorFieldGuide.tsx` line 1:

```tsx
import { colorSpaces } from "@urcolor/core";
```

Every name on the line is moving, so rewrite in place, no split:

```tsx
import { colorSpaces } from "@urcolor/shared";
```

- [ ] **Step 7: Wire docs to shared**

These demo files are compiled by VitePress, which resolves `@urcolor/*` through the aliases in `docs/.vitepress/config.ts`. Add to `docs/package.json` `dependencies`:

```json
    "@urcolor/shared": "workspace:*",
```

and to the `resolve.alias` block in `docs/.vitepress/config.ts`, alongside the existing core alias at line 97:

```ts
        "@urcolor/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
```

- [ ] **Step 8: Reinstall and run the gate**

```bash
rm -rf packages/core/dist packages/shared/dist
bun install
bun test && bun run lint && bun run build
```

Expected: all pass.

- [ ] **Step 9: Verify the boundary held**

```bash
grep -rn "colorSpaces\|getChannelConfig\|displayToNative\|nativeToDisplay" packages/core/src/
```

Expected: no output.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor: move color-space UI config from core to shared"
```

---

## Task 5: Move `geometry.ts` to shared

Last of the three, because gradient had to leave core first. Once geometry lands in shared, `gradient.ts` reaches it relatively again instead of through `@urcolor/core`.

**Files:**
- Move: `packages/core/src/geometry.ts` → `packages/shared/src/geometry.ts`
- Move: `packages/core/test/geometry.test.ts` → `packages/shared/test/geometry.test.ts`
- Modify: `packages/shared/src/index.ts` (add export)
- Modify: `packages/shared/src/gradient.ts` (split the geometry names back to a relative import)
- Modify: `packages/core/src/index.ts` (drop the geometry export line)
- Modify: `packages/core/test/exports.test.ts` (replace the positive block with a negative assertion)
- Modify: the 17 consumer files listed in Step 5

**Interfaces:**
- Consumes: the relocated `gradient.ts` from Task 3.
- Produces: all twelve GEOMETRY symbols on `@urcolor/shared`. `Point` is `{ x: number; y: number }`; `PolarCoord` is `{ angle: number; radius: number }`. Both are type-only exports.

- [ ] **Step 1: Move the module and its test**

```bash
git mv packages/core/src/geometry.ts packages/shared/src/geometry.ts
git mv packages/core/test/geometry.test.ts packages/shared/test/geometry.test.ts
```

`geometry.ts` has no imports at all, and its test imports only `../src/geometry`. Neither file body needs an edit.

- [ ] **Step 2: Export it from shared**

Append to `packages/shared/src/index.ts`:

```ts
export * from "./geometry";
```

- [ ] **Step 3: Restore gradient's relative geometry import**

Task 3 left `packages/shared/src/gradient.ts` line 1 as a single combined import from `@urcolor/core`. Split the two geometry names out:

```ts
import { channelIndexOf, Color, convert, interpolate, type ColorObject, type Coords, type SpaceId } from "@urcolor/core";
import { barycentricCoords, type Point } from "./geometry";
```

- [ ] **Step 4: Drop it from core's surface**

Delete these two lines from `packages/core/src/index.ts`:

```ts
// Geometry helpers.
export { polarToCartesian, cartesianToPolar, clampToCircle, normalizeAngle, triangleVertices, barycentricCoords, barycentricToCartesian, pointInTriangle, clampToTriangle, insetTriangle, type Point, type PolarCoord } from "./geometry";
```

Core's `src/index.ts` now ends with the color-library exports and nothing else.

In `packages/core/test/exports.test.ts`, replace the now-single-name block with a negative assertion that makes the boundary a CI-enforced contract:

```ts
  it("no longer exposes the gradient, geometry or space-config surface", () => {
    for (const name of [
      "drawGradient",
      "drawLinearGradient",
      "interpolateStops",
      "sampleBilinearGrid",
      "sampleChannelGrid",
      "sampleTriangleGrid",
      "samplePolarGrid",
      "sampleConicRing",
      "polarToCartesian",
      "cartesianToPolar",
      "clampToCircle",
      "normalizeAngle",
      "triangleVertices",
      "barycentricCoords",
      "barycentricToCartesian",
      "pointInTriangle",
      "clampToTriangle",
      "insetTriangle",
      "colorSpaces",
      "getChannelConfig",
      "displayToNative",
      "nativeToDisplay",
    ]) {
      expect(core).not.toHaveProperty(name);
    }
  });
```

- [ ] **Step 5: Retarget the consumers**

Apply the Mixed-Import Rule to every GEOMETRY symbol in these 17 files:

```
docs/.vitepress/components/HeroInstrument.vue
packages/angular/src/components/color-ring/root/color-ring-root.ts
packages/angular/src/components/color-triangle/root/color-triangle-root.ts
packages/angular/src/components/color-triangle/thumb/color-triangle-thumb.ts
packages/angular/src/components/color-wheel/root/color-wheel-root.ts
packages/react/src/components/color-ring/root/ColorRingRoot.tsx
packages/react/src/components/color-triangle/root/ColorTriangleRoot.tsx
packages/react/src/components/color-triangle/thumb/ColorTriangleThumb.tsx
packages/react/src/components/color-wheel/root/ColorWheelRoot.tsx
packages/svelte/src/lib/components/color-ring/root/ColorRingRoot.svelte
packages/svelte/src/lib/components/color-triangle/root/ColorTriangleRoot.svelte
packages/svelte/src/lib/components/color-triangle/thumb/ColorTriangleThumb.svelte
packages/svelte/src/lib/components/color-wheel/root/ColorWheelRoot.svelte
packages/vue/src/components/ColorRing/ColorRingRoot.vue
packages/vue/src/components/ColorTriangle/ColorTriangleRoot.vue
packages/vue/src/components/ColorTriangle/ColorTriangleThumb.vue
packages/vue/src/components/ColorWheel/ColorWheelRoot.vue
```

Worked example — `packages/vue/src/components/ColorWheel/ColorWheelRoot.vue` originally read:

```ts
import { cartesianToPolar, Color, colorSpaces, normalizeAngle, type SpaceId } from "@urcolor/core";
```

Task 4 already pulled `colorSpaces` out, so the file currently looks like:

```ts
import { cartesianToPolar, Color, normalizeAngle, type SpaceId } from "@urcolor/core";
import { colorSpaces } from "@urcolor/shared";
```

Move the two GEOMETRY names onto the existing shared line, leaving core with `Color` and `SpaceId`:

```ts
import { Color, type SpaceId } from "@urcolor/core";
import { cartesianToPolar, colorSpaces, normalizeAngle } from "@urcolor/shared";
```

- [ ] **Step 6: Reinstall and run the gate**

```bash
rm -rf packages/core/dist packages/shared/dist
bun install
bun test && bun run lint && bun run build
```

Expected: all pass, including the new negative assertion.

- [ ] **Step 7: Verify core is pure**

```bash
ls packages/core/src
```

Expected: `color/` and `index.ts` only — no `gradient.ts`, `geometry.ts` or `color-spaces.ts`.

```bash
grep -rn "getContext\|WebGL\|HTMLCanvasElement\|devicePixelRatio" packages/core/src/
```

Expected: no output. Core no longer touches the DOM.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: move geometry helpers from core to shared"
```

---

## Task 6: Lock the shared export surface

Core's boundary is now CI-enforced by Task 5's negative assertion. Shared has no equivalent — it has never had an exports test at all.

**Files:**
- Create: `packages/shared/test/exports.test.ts`

**Interfaces:**
- Consumes: the full `@urcolor/shared` surface produced by Tasks 1, 3, 4 and 5.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the failing test**

Create `packages/shared/test/exports.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import * as shared from "../src/index";

describe("@urcolor/shared exports", () => {
  it("exposes the picker behavior surface", () => {
    for (const name of [
      "clamp",
      "snapToStep",
      "renderToCanvas",
      "CHECKERBOARD_BACKGROUND",
      "resolveChannelConfig",
      "ALPHA_CONFIG",
    ]) {
      expect(shared).toHaveProperty(name);
    }
  });

  it("exposes the gradient surface", () => {
    for (const name of [
      "drawGradient",
      "drawLinearGradient",
      "interpolateStops",
      "sampleBilinearGrid",
      "sampleChannelGrid",
      "sampleTriangleGrid",
      "samplePolarGrid",
      "sampleConicRing",
    ]) {
      expect(shared).toHaveProperty(name);
    }
  });

  it("exposes the geometry surface", () => {
    for (const name of [
      "polarToCartesian",
      "cartesianToPolar",
      "clampToCircle",
      "normalizeAngle",
      "triangleVertices",
      "barycentricCoords",
      "barycentricToCartesian",
      "pointInTriangle",
      "clampToTriangle",
      "insetTriangle",
    ]) {
      expect(shared).toHaveProperty(name);
    }
  });

  it("exposes the space-config surface", () => {
    for (const name of [
      "colorSpaces",
      "getChannelConfig",
      "displayToNative",
      "nativeToDisplay",
    ]) {
      expect(shared).toHaveProperty(name);
    }
  });
});
```

- [ ] **Step 2: Run it**

```bash
bun test packages/shared/test/exports.test.ts
```

Expected: PASS — Tasks 1, 3, 4 and 5 already put every one of these in place. If any name fails, a previous task's `export *` line is missing.

The names in the first block are drawn from the pre-existing shared modules (`math.ts`, `canvas.ts`, `channel-model.ts`). If one of them does not resolve, check its actual exported identifier in `packages/shared/src/` and correct the test — do not add a new export to make the test pass.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/test/exports.test.ts
git commit -m "test(shared): assert the full export surface"
```

---

## Task 7: Manifests — versions, keywords, ranges, build order

Every code change is done. This task makes the published metadata honest.

**Files:**
- Modify: `packages/core/package.json`
- Modify: `packages/shared/package.json`
- Modify: `packages/urcolor/package.json`
- Modify: `packages/{vue,react,svelte,angular,relative,i18n}/package.json`
- Modify: `package.json` (root build order)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Bump versions**

Set `"version"` in each manifest:

| File | New version |
|---|---|
| `packages/core/package.json` | `2.0.0` |
| `packages/shared/package.json` | `1.0.0` (already — verify, do not bump) |
| `packages/urcolor/package.json` | `2.0.0` |
| `packages/vue/package.json` | `2.0.0` |
| `packages/react/package.json` | `2.0.0` |
| `packages/svelte/package.json` | `2.0.0` |
| `packages/angular/package.json` | `2.0.0` |
| `packages/relative/package.json` | `2.0.0` |
| `packages/i18n/package.json` | `2.0.0` |

`@urcolor/shared` stays at `1.0.0` — it is a new package name and has never been published.

- [ ] **Step 2: Fix core's keywords**

In `packages/core/package.json`, delete `"gradient"` and `"webgl"` from the `keywords` array. The remaining entries stay in order:

```json
  "keywords": [
    "color",
    "color-picker",
    "color-space",
    "hsl",
    "oklch",
    "oklab",
    "display-p3",
    "color-conversion"
  ],
```

- [ ] **Step 3: Fix urcolor's keywords and description**

`packages/urcolor/package.json` re-exports core verbatim, so it advertises the same removed surface. Delete `"gradient"` and `"webgl"` from its `keywords` array, matching Step 2.

Its `description` currently reads:

> Zero-dependency CSS Color 4 engine: parse, convert, mix, compare and serialize colors across 15 spaces. The unscoped alias for @urcolor/core.

That is still accurate — leave it.

- [ ] **Step 4: Give shared the keywords it earned**

In `packages/shared/package.json`, add `"gradient"` and `"webgl"` to the `keywords` array so the rendering capability is discoverable where it now lives:

```json
  "keywords": [
    "color",
    "color-picker",
    "headless",
    "framework-agnostic",
    "slider",
    "state-machine",
    "gradient",
    "webgl"
  ],
```

- [ ] **Step 5: Confirm the build order**

The root `package.json` `build` script must build core before shared, and shared before the framework packages:

```
core → urcolor → shared → relative → i18n → vue → react → svelte → angular
```

Task 1 Step 4 already renamed `packages/primitives` to `packages/shared` in place. Verify the resulting order matches the line above; the existing order already satisfies it.

- [ ] **Step 6: Verify publishability**

```bash
bun test scripts/check-publishable.test.ts
bun run scripts/check-publishable.ts
```

Expected: PASS with no reported problems. This script checks every manifest for a license, a version, resolvable entry paths and no unresolved `workspace:` ranges.

- [ ] **Step 7: Run the gate**

```bash
bun test && bun run lint && bun run build
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: bump to 2.0.0 and correct package metadata"
```

---

## Task 8: Documentation

Prose across the guide and six locales still attributes WebGL gradients to core.

**Files:**
- Modify: `README.md`
- Modify: `docs/guide/index.md`, `docs/guide/installation.md`, `docs/guide/features.md`
- Modify: `docs/{ja,ru,zh,de,fr,es}/guide/index.md` and `.../installation.md`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Update the README package table**

`README.md` lines 27–28 currently read (Task 1 already renamed the specifier in line 28; the link target and label may still say `primitives` — fix both here):

```
| [`@urcolor/core`](./packages/core) | Color parsing, conversion, mixing, gamut mapping, grid samplers, WebGL gradients |
| [`@urcolor/primitives`](./packages/primitives) | Framework-agnostic behavior shared by every binding |
```

Replace both lines with:

```
| [`@urcolor/core`](./packages/core) | Color parsing, conversion, mixing, gamut mapping, contrast, delta-E |
| [`@urcolor/shared`](./packages/shared) | Framework-agnostic picker behavior, grid samplers, WebGL gradients, geometry, channel configuration |
```

Lines 57–60 in the repo-layout block read:

```
packages/
  core/        # @urcolor/core — color engine, grid samplers, WebGL gradients
  urcolor/     # urcolor — unscoped re-export of the core
  primitives/  # @urcolor/primitives — shared framework-agnostic behavior
```

Replace with:

```
packages/
  core/        # @urcolor/core — the color engine
  urcolor/     # urcolor — unscoped re-export of the core
  shared/      # @urcolor/shared — picker behavior, grid samplers, WebGL gradients
```

The remaining rows and layout lines are unchanged.

- [ ] **Step 2: Update the English guide**

`docs/guide/index.md` line 7:

> `@urcolor/core` — A zero-dependency CSS Color 4 library (parse, convert, serialize, gamut-map, interpolate) plus WebGL canvas gradient generators for color area sliders.

Split the gradient half onto a `@urcolor/shared` bullet. Core's bullet keeps only the color-library claims.

`docs/guide/installation.md` line 13:

> | `@urcolor/core` | Core color logic, WebGL rendering, and accessibility utilities |

Change to core color logic only; move WebGL rendering to the shared row. Line 112 reads "Every framework package depends on `@urcolor/core` and `@urcolor/primitives`" — Task 1 already renamed the specifier, so verify it now reads `@urcolor/shared`. Lines 147–150 describe `urcolor` as re-exporting core; still accurate, leave them.

`docs/guide/features.md` line 300 describes the two packages each binding layers over — verify the names are current and the capability split is right.

- [ ] **Step 3: Mirror into the six locales**

Apply the same edits to `index.md` and `installation.md` under `docs/ja/guide/`, `docs/ru/guide/`, `docs/zh/guide/`, `docs/de/guide/`, `docs/fr/guide/` and `docs/es/guide/`, translating the changed sentences rather than dropping English in.

Known lines: `docs/ja/guide/installation.md:12` (`コアのカラーロジック、WebGL 描画…`), `docs/ru/guide/index.md:7` (`…и WebGL-генераторы градиентов на canvas…`). Locate the equivalents in the other four by matching structure against the English source.

- [ ] **Step 4: Verify no stale attribution survives**

```bash
grep -rn "urcolor/core" README.md docs/guide docs/ja docs/ru docs/zh docs/de docs/fr docs/es \
  | grep -i "webgl\|gradient\|grid sampler"
```

Expected: no output. Any hit is a line still crediting core with rendering.

- [ ] **Step 5: Build the docs**

```bash
bun run docs:build
```

Expected: PASS. This compiles every demo component, so it is the real proof that Task 4's docs retargets and the new `@urcolor/shared` alias resolve.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "docs: attribute gradient rendering to @urcolor/shared"
```

---

## Task 9: Regenerate benchmarks and run the final gate

`docs/guide/benchmarks.md` is generated, not hand-written. It still links `packages/core/bench` and reports numbers measured before the move.

**Files:**
- Modify: `docs/guide/benchmarks.md` (generated output — do not hand-edit)
- Modify: `docs/public/benchmarks.json` (generated output)

**Interfaces:**
- Consumes: everything above.
- Produces: nothing.

- [ ] **Step 1: Regenerate**

```bash
bun run --cwd packages/core bench:report --json
```

Expected: rewrites `docs/guide/benchmarks.md` and `docs/public/benchmarks.json`. Run it on an otherwise idle machine — background load inflates the averages.

- [ ] **Step 2: Check the generated prose**

The gradient suite's blurb in `packages/core/bench/report.ts` (around line 92) says "urcolor's WebGL entry points are not benchmarked here". Still true. The page's intro says every number is generated by "the suites in `packages/core/bench`" — also still true; the runner did not move, only the module it imports. No source edit needed.

- [ ] **Step 3: Full clean verification**

```bash
rm -rf packages/core/dist packages/shared/dist node_modules/@urcolor
bun install
bun test
bun run lint
bun run build
bun run docs:build
```

Expected: all five pass from a cold start. This is the acceptance gate for the whole plan.

- [ ] **Step 4: Confirm the boundary one last time**

```bash
ls packages/core/src
grep -rn "@urcolor/shared" packages/core/package.json
```

Expected: `color/` and `index.ts` only; the single `@urcolor/shared` hit sits under `devDependencies`, never `dependencies`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: regenerate benchmarks after the core/shared split"
```

---

## Post-Merge, Not In This Plan

Once `@urcolor/shared@1.0.0` is published:

```bash
npm deprecate @urcolor/primitives "@urcolor/primitives is now @urcolor/shared"
```

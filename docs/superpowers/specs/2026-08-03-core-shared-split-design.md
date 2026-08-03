# Core / Shared Split

**Date:** 2026-08-03
**Status:** Approved

## Goal

Make `@urcolor/core` a pure color library — a direct competitor to culori, colorjs.io, chroma-js, colord and tinycolor — by moving every rendering and picker-UI concern out of it. All three UI modules land in `@urcolor/primitives`, which is renamed to `@urcolor/shared` in the same change.

## Context

`@urcolor/core` today mixes two unrelated products:

- `src/color/**` (~1.5k lines) — parsing, conversion, serialization, gamut mapping, interpolation, delta-E, contrast, named colors, the space registry. Zero dependencies, zero DOM. This is the library benchmarked against culori and colorjs.io.
- Three UI modules that only exist to paint color pickers:
  - `src/gradient.ts` (567 lines) — WebGL shader path (`drawGradient`, `drawLinearGradient`) plus the CPU grid samplers (`sampleBilinearGrid`, `sampleChannelGrid`, `sampleTriangleGrid`, `samplePolarGrid`, `sampleConicRing`, `interpolateStops`). Touches `HTMLCanvasElement` and `WebGLRenderingContext`.
  - `src/geometry.ts` (138 lines) — polar/triangle math for wheels, rings and triangle pickers. Pure, no imports.
  - `src/color-spaces.ts` (184 lines) — per-channel UI configuration (label, min/max, step, display format) and the `displayToNative`/`nativeToDisplay` scaling pair.

Nobody reaching for a color library wants a WebGL gradient renderer in their bundle, and the `webgl` keyword on the published manifest actively misrepresents what core is.

`@urcolor/primitives` is the natural home: it already holds the framework-agnostic picker behavior (slider, drag, toggle, keys, labels, channel model, canvas blitting, math, data attributes), already depends on core, and is already a runtime dependency of every framework binding. Its name has never fit — it holds shared helpers, not UI primitives in the Radix/Base UI sense — so the rename rides along with the boundary change rather than costing a second major.

Both `@urcolor/core` and `@urcolor/primitives` are published at `1.0.0`. This is a breaking change to both.

## Architecture

```
@urcolor/core      color math only — parse, convert, serialize, gamut, mix, deltaE, contrast
  │
  └── @urcolor/shared   (renamed from @urcolor/primitives)
        │               picker behavior + gradient rendering + geometry + channel config
        ├── @urcolor/vue
        ├── @urcolor/react
        ├── @urcolor/svelte
        └── @urcolor/angular

@urcolor/core
  ├── urcolor            unscoped alias, re-exports core verbatim
  ├── @urcolor/relative  CSS Color 5 relative syntax plugin
  └── @urcolor/i18n      color naming
```

No back-compat re-export shims in core. A clean break is the point of the major; leaving `drawGradient` re-exported would defeat the goal.

## Package Table

| Package | Version | Change |
|---|---|---|
| `@urcolor/core` | 1.0.0 → **2.0.0** | Loses `gradient.ts`, `geometry.ts`, `color-spaces.ts`. Gains a public `channelIndexOf` export. Drops `gradient` and `webgl` keywords. |
| `@urcolor/shared` | **1.0.0** (new name) | Renamed from `@urcolor/primitives`. Gains the three UI modules. Depends on `@urcolor/core ^2.0.0`. |
| `urcolor` | 1.0.0 → **2.0.0** | Code unchanged (`export * from "@urcolor/core"`); sheds the gradient surface automatically. Drops `gradient`/`webgl` keywords, description reworded. |
| `@urcolor/vue` | 1.0.0 → **2.0.0** | Imports retarget; dep ranges `core ^2.0.0`, `shared ^1.0.0`. |
| `@urcolor/react` | 1.0.0 → **2.0.0** | Same. |
| `@urcolor/svelte` | 1.0.0 → **2.0.0** | Same. |
| `@urcolor/angular` | 1.0.0 → **2.0.0** | Same. |
| `@urcolor/relative` | 1.0.0 → **2.0.0** | Code unchanged; core range → `^2.0.0`. |
| `@urcolor/i18n` | 1.0.0 → **2.0.0** | Code unchanged; core range → `^2.0.0`. |

`relative` and `i18n` take a major despite no code change: their published dependency range moves to a core major that removed exports, which is breaking for anyone resolving the tree.

## New Core Export: `channelIndexOf`

`gradient.ts` calls `channelIndexOf` from `src/color/registry.ts`. That function is exported from its module but **not** from `src/index.ts` — it is currently an internal. Once gradient lives outside core, it becomes part of core's public API:

```ts
export { SPACES, spaceDef, hueIndexOf, channelIndexOf } from "./color/registry";
```

This is an addition, not a break. It is also defensible on its own terms — `hueIndexOf` is already public and `channelIndexOf` is its general form.

## File Moves

Performed with `git mv` so history follows the code.

```
packages/primitives                              → packages/shared

packages/core/src/gradient.ts                    → packages/shared/src/gradient.ts
packages/core/src/geometry.ts                    → packages/shared/src/geometry.ts
packages/core/src/color-spaces.ts                → packages/shared/src/color-spaces.ts

packages/core/test/gradient.test.ts              → packages/shared/test/gradient.test.ts
packages/core/test/gradient-samplers.test.ts     → packages/shared/test/gradient-samplers.test.ts
packages/core/test/geometry.test.ts              → packages/shared/test/geometry.test.ts
packages/core/test/color-spaces.test.ts          → packages/shared/test/color-spaces.test.ts
```

Import rewrites inside the moved sources:

| Was | Becomes |
|---|---|
| `./color/color` (`Color`) | `@urcolor/core` |
| `./color/convert` (`convert`) | `@urcolor/core` |
| `./color/interpolate` (`interpolate`) | `@urcolor/core` |
| `./color/registry` (`channelIndexOf`) | `@urcolor/core` |
| `./color/types` (`ColorObject`, `Coords`, `SpaceId`) | `@urcolor/core` |
| `./geometry` (`barycentricCoords`, `Point`) | stays relative — co-located in shared |

`geometry.ts` has no imports at all and moves untouched. `color-spaces.ts` imports only `type SpaceId`.

`packages/shared/src/index.ts` gains:

```ts
export * from "./gradient";
export * from "./geometry";
export * from "./color-spaces";
```

Flat layout, matching the nine modules already there.

## Consumer Retarget

Framework packages already depend on primitives, so no new dependency edges appear — this is import-line surgery. Every one of these symbols moves from `@urcolor/core` to `@urcolor/shared` at the call site:

**Gradient:** `drawGradient`, `drawLinearGradient`, `interpolateStops`, `sampleBilinearGrid`, `sampleChannelGrid`, `sampleTriangleGrid`, `samplePolarGrid`, `sampleConicRing`

**Geometry:** `polarToCartesian`, `cartesianToPolar`, `clampToCircle`, `normalizeAngle`, `triangleVertices`, `barycentricCoords`, `barycentricToCartesian`, `pointInTriangle`, `clampToTriangle`, `insetTriangle`, `Point`, `PolarCoord`

**Space config:** `colorSpaces`, `getChannelConfig`, `displayToNative`, `nativeToDisplay`, `ChannelConfig`, `ColorSpaceConfig`

Many call sites import a mix of these and `Color`/`SpaceId`, which stay on core — those lines split into two imports rather than moving wholesale.

Separately, the bare identifier `@urcolor/primitives` → `@urcolor/shared` across:

- `packages/{vue,react,svelte,angular}/package.json` dependencies
- `packages/vue/vite.config.ts`, `packages/react/vite.config.ts` — `rollupOptions.external`
- `packages/angular/ng-package.json` — `allowedNonPeerDependencies`
- `packages/svelte/src/lib/**` — ~30 component and hook files
- `packages/vue/src/shared/**`, `packages/react/src/**`, `packages/angular/src/**`
- `scripts/check-publishable.test.ts` — a fixture references the name

## Bench

`packages/core/bench/gradient.bench.ts` stays in core's bench suite and imports the samplers from `@urcolor/shared` via a new **devDependency** on core:

```json
"devDependencies": { "@urcolor/shared": "workspace:*" }
```

This is a dev-only edge. It does not appear in the published tarball (`files: ["dist"]`, and the bench never enters the bundle), so there is no runtime cycle — shared depends on core at runtime, core depends on shared only to run benchmarks.

Rationale: the gradient suite compares urcolor's grid samplers against hand-rolled loops built on culori, chroma-js and colorjs.io. Those competitor devDependencies live in core, and the report generator (`bench/report.ts`) emits a single `docs/guide/benchmarks.md` from all eight suites. Splitting the runner would mean duplicating the mitata harness, the competitor devDeps, and the report pipeline, then stitching two markdown outputs together — cost with no benefit.

`benchmarks.md` is regenerated (`bun run --cwd packages/core bench:report`) so its numbers and its `packages/core/bench` source link stay honest.

## Tests

`packages/core/test/exports.test.ts` has a block titled *"still exposes the gradient, geometry and space-config surface"*. It is replaced with a negative assertion — those names must be **absent** from core — which turns the boundary into something CI enforces rather than a convention that erodes.

A new `packages/shared/test/exports.test.ts` asserts the full shared surface: the nine existing modules plus the three arrivals.

The four moved test files keep their `../src/{gradient,geometry,color-spaces}` relative imports — those modules travel with them. Only the core reaches change: `gradient.test.ts` and `gradient-samplers.test.ts` import `Color` from `../src/color/color` and `SpaceId` from `../src/color/types`, which become `@urcolor/core`. `geometry.test.ts` and `color-spaces.test.ts` need no rewrite at all.

**Verification gate**, in order:

```
bun test
bun run lint
bun run build
bun run docs:build
```

`bun run lint` covers `eslint`, `vue-tsc --noEmit`, `svelte-check` and `ng check` — the type-level proof that every retargeted import resolves.

## Workspace Mechanics

Root type-checking has no `paths` mapping — packages resolve through the `node_modules/@urcolor/*` workspace symlinks and each manifest's `types` field, which points at `dist/`. Two consequences:

- `bun install` must re-run after the directory rename so `node_modules/@urcolor/shared` is linked and the stale `@urcolor/primitives` link is dropped.
- `packages/core/dist` and the old `packages/primitives/dist` must be removed before verifying. A stale `core/dist/gradient.d.ts` would let removed exports keep type-checking and hide the very breakage the change is meant to surface.

Checked-in build output under `packages/svelte/dist` and `packages/svelte/.svelte-kit/__package__` still carries the old imports; it regenerates on build and needs no manual edit.

## Build Order

Root `package.json` `build` script, updated for the new name and the position of shared:

```
core → urcolor → shared → relative → i18n → vue → react → svelte → angular
```

## Docs

- `docs/.vitepress/config.ts` — add a `@urcolor/shared` resolve alias alongside the existing core/vue/react/i18n aliases.
- `docs/package.json` — add `"@urcolor/shared": "workspace:*"`.
- `README.md` — the package table row for core reads "grid samplers, WebGL gradients"; that moves to the shared row. The repo-layout tree comment updates too.
- `docs/guide/index.md`, `docs/guide/installation.md`, `docs/guide/features.md` — every "core … WebGL canvas gradient generators" and "WebGL rendering" claim reattributes to shared; `@urcolor/primitives` renames.
- The same three pages in all six locales: `docs/{ja,ru,zh,de,fr,es}/guide/`.
- `docs/guide/benchmarks.md` — regenerated, not hand-edited.

## npm Rename

After the change ships and `@urcolor/shared@1.0.0` is published, one manual step:

```
npm deprecate @urcolor/primitives "@urcolor/primitives is now @urcolor/shared"
```

`@urcolor/primitives@1.0.0` stays installable for anyone pinned to it; no further versions publish under the old name. This is a release-time action, not part of the code change.

## Out of Scope

- No back-compat re-export shims in `@urcolor/core`.
- No changes to the internals of any moved module — the code moves byte-for-byte apart from its import lines.
- No changes to `@urcolor/relative` or `@urcolor/i18n` source.
- The npm deprecation and the publish itself are release-time actions, tracked separately.

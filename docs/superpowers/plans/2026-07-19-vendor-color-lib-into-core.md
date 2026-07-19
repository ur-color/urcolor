# Vendor a Color Library into `@urcolor/core` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the `internationalized-color` dependency from the repo by vendoring a zero-dependency color library into `packages/core`, based on `../urvis/packages/color`.

**Architecture:** The upstream library is copied verbatim into `packages/core/src/color/`, then extended with the two things urcolor needs that it lacks: an `hsv` working space and a `Color` API shaped for the picker components (`Color.parse` returning `null`, and `with()` accepting a target space). Core re-exports it flat from the package root. `packages/vue`, `packages/react`, and the docs then migrate from `internationalized-color` to `@urcolor/core`, which also means renaming culori space ids (`rgb`, `p3`, `a98`, `prophoto`) to CSS Color 4 ids (`srgb`, `display-p3`, `a98-rgb`, `prophoto-rgb`).

**Tech Stack:** TypeScript, Bun (runtime, test runner, bundler), Vue 3, React, VitePress, Storybook, ESLint + `vue-tsc`.

**Spec:** `docs/superpowers/specs/2026-07-19-vendor-color-lib-into-core-design.md`

## Global Constraints

- **Upstream source of truth:** `/Users/grandmagus/Documents/Projects/urvis/packages/color`. Referred to below as `$URVIS`. It is a *separate repository* — never modify it, only read from it.
- **Zero runtime dependencies.** When this plan is done, `packages/core/package.json` has an empty `dependencies` object. Do not add any package to it.
- **Use Bun, never npm/node/yarn/pnpm.** `bun test`, `bun run <script>`, `bun install`.
- **Import specifiers in `packages/core/src/` carry no file extension.** Write `from "./types"`, never `from "./types.ts"`. Core's `build:types` runs `tsc --emitDeclarationOnly`; `.ts` specifiers would survive into `dist/*.d.ts` and resolve to nothing.
- **Canonical space ids are CSS Color 4 ids**, from the `SpaceId` union: `srgb`, `srgb-linear`, `hsl`, `hsv`, `hwb`, `lab`, `lch`, `oklab`, `oklch`, `display-p3`, `a98-rgb`, `prophoto-rgb`, `rec2020`, `xyz-d65`, `xyz-d50`. The culori ids `rgb`, `p3`, `a98`, `prophoto`, and the mode-string type `string` must not appear anywhere by the end.
- **Do not port** `$URVIS/src/random.ts` or `$URVIS/src/random.test.ts`.
- **Do not port** anything from `internationalized-color`: no `naming.ts`, no `kdtree.ts`, no `locales/`, no `bootstrap/css.ts`. The color-naming feature is being deleted, not reimplemented.
- **`packages/core/src/i18n/` is unrelated** to color naming — it holds channel-label translations. Leave it alone except where a space-id rename touches it.
- **Never copy build artifacts.** `$URVIS/src` contains stale `.js`, `.js.map`, and `.d.ts` files beside its `.ts` sources. Only `.ts` files move.
- **Commit after every task.** Branch is `release/v1`; a breaking change is expected there.

---

## File Structure

**Created — `packages/core/src/color/` (vendored):**

| File | Responsibility |
| --- | --- |
| `types.ts` | `SpaceId`, `Coords`, `ColorObject`, `SpaceDef` |
| `tagged.ts` | Compile-time space tagging: `ColorIn<S>`, `OklchColor`, `SrgbColor`, `P3Color` |
| `matrix.ts` | 3×3 matrix multiply helper for RGB primaries |
| `polar.ts` | Rectangular ↔ polar shared by Lab/LCH and Oklab/Oklch |
| `components.ts` | CSS functional-notation token parsing/formatting |
| `registry.ts` | `SPACES` map, `spaceDef()`, `hueIndexOf()`, `copyCoords()` |
| `spaces/*.ts` | One module per space: conversion + parse + serialize |
| `parse.ts` | `parse()` (throws) / `tryParse()` (null) |
| `serialize.ts` | `serialize()`, `ColorFormat` |
| `convert.ts` | Space conversion through the XYZ-D65 hub |
| `gamut.ts` | `inGamut()`, `gamutMap()` |
| `interpolate.ts` | `interpolate()`, `mix()` |
| `manipulate.ts` | `lighten`, `darken`, `saturate`, … |
| `deltaE.ts` | `deltaE()`, `deltaEOK()` |
| `contrast.ts` | `contrast()` |
| `named.ts` | CSS named colors + `parseNamed()` |
| `color.ts` | The `Color` class |
| `index.ts` | Barrel for the vendored library |

**Created — new:**

| File | Responsibility |
| --- | --- |
| `packages/core/src/color/spaces/hsv.ts` | The `hsv` working space (not a CSS space) |
| `packages/core/test/color/**` | Ported upstream test suite |

**Modified:**

| File | Change |
| --- | --- |
| `packages/core/src/index.ts` | Re-export the vendored library |
| `packages/core/src/color-spaces.ts` | CSS space ids; `mode`→`space`; culori→native renames |
| `packages/core/src/gradient.ts` | Migrate off `internationalized-color` |
| `packages/core/package.json` | Empty `dependencies` |
| `packages/vue/src/**` | Migrate off `internationalized-color` |
| `packages/react/src/**` | Migrate off `internationalized-color` |
| `docs/**` | Migrate demos; drop naming feature; rewrite prose |
| `package.json`, `docs/.vitepress/config.ts`, `CLAUDE.md` | Drop the dependency and its conventions |

**Deleted:** `packages/core/src/index.d.ts`, `gradient.d.ts`, `geometry.d.ts`, `color-spaces.d.ts`, `env.d.ts` — stale build artifacts checked in beside the sources.

---

## Task 1: Vendor the upstream library

**Files:**
- Create: `packages/core/src/color/**` (copied from `$URVIS/src`)
- Create: `packages/core/test/color/**` (copied from `$URVIS/src`)
- Delete: `packages/core/src/index.d.ts`, `packages/core/src/gradient.d.ts`, `packages/core/src/geometry.d.ts`, `packages/core/src/color-spaces.d.ts`, `packages/core/src/env.d.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: the whole vendored module tree under `packages/core/src/color/`, importable as `../src/color/<name>` from tests. Key exports later tasks rely on: `Color` (class), `parse(input: string): ColorObject`, `tryParse(input: string): ColorObject | null`, `serialize(color: ColorObject, format?: ColorFormat): string`, `convert<S extends SpaceId>(color: ColorObject, target: S): ColorIn<S>`, `SPACES`, `spaceDef(space: SpaceId): SpaceDef`, `hueIndexOf(space: SpaceId): number`, `type SpaceId`, `type Coords`, `type ColorObject`, `type SpaceDef`.

This task is a mechanical copy. No behaviour changes — the ported tests must pass exactly as upstream wrote them.

- [ ] **Step 1: Copy the `.ts` sources, excluding tests and `random.ts`**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor
URVIS=/Users/grandmagus/Documents/Projects/urvis/packages/color
mkdir -p packages/core/src/color/spaces

# Sources only: .ts, not .test.ts, not random.ts, not build artifacts.
find "$URVIS/src" -name '*.ts' \
  ! -name '*.test.ts' ! -name '*.d.ts' ! -name 'random.ts' \
  | while read -r f; do
      rel="${f#"$URVIS/src/"}"
      mkdir -p "packages/core/src/color/$(dirname "$rel")"
      cp "$f" "packages/core/src/color/$rel"
    done

find packages/core/src/color -name '*.ts' | sort
```

Expected: 30-odd files listed — `color.ts`, `components.ts`, `contrast.ts`, `convert.ts`, `deltaE.ts`, `gamut.ts`, `index.ts`, `interpolate.ts`, `manipulate.ts`, `matrix.ts`, `named.ts`, `parse.ts`, `polar.ts`, `registry.ts`, `serialize.ts`, `tagged.ts`, `types.ts`, and `spaces/{a98,colorFn,hsl,hwb,lab,lch,oklab,oklch,p3,prophoto,rec2020,rgbSpace,srgb,srgbLinear,xyz}.ts`. No `.js`, no `.js.map`, no `.d.ts`, no `random.ts`.

- [ ] **Step 2: Copy the test files**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor
URVIS=/Users/grandmagus/Documents/Projects/urvis/packages/color
mkdir -p packages/core/test/color/spaces

find "$URVIS/src" -name '*.test.ts' ! -name 'random.test.ts' \
  | while read -r f; do
      rel="${f#"$URVIS/src/"}"
      mkdir -p "packages/core/test/color/$(dirname "$rel")"
      cp "$f" "packages/core/test/color/$rel"
    done

find packages/core/test/color -name '*.test.ts' | sort
```

Expected: `color`, `contrast`, `convert`, `deltaE`, `interpolate`, `gamut`, `manipulate`, `named`, `parse`, `serialize`, `tagged` at the top level, plus `spaces/{colorFn,hsl,hwb,lab,lch,oklab,srgb,wideGamut,xyz}.test.ts`. No `random.test.ts`.

- [ ] **Step 3: Strip `.ts` extensions from every import specifier**

The vendored sources import as `from "./types.ts"`. Core's convention — and its `emitDeclarationOnly` build — require `from "./types"`.

```bash
cd /Users/grandmagus/Documents/Projects/urcolor
find packages/core/src/color packages/core/test/color -name '*.ts' -print0 \
  | xargs -0 sed -i '' -E 's/(from "\.\.?\/[^"]*)\.ts"/\1"/g'

# Verify none survive.
grep -rn '\.ts"' packages/core/src/color packages/core/test/color || echo "CLEAN"
```

Expected: `CLEAN`.

- [ ] **Step 4: Point the test files at the vendored sources**

Upstream tests sit beside their sources and import `./parse`; here they live one directory up, in `test/color/`, and must import `../../src/color/parse`.

```bash
cd /Users/grandmagus/Documents/Projects/urcolor

# Top-level tests: ./x -> ../../src/color/x  and  ./spaces/x -> ../../src/color/spaces/x
find packages/core/test/color -maxdepth 1 -name '*.test.ts' -print0 \
  | xargs -0 sed -i '' -E 's|from "\./|from "../../src/color/|g'

# spaces/ tests: ./x -> ../../../src/color/spaces/x  and  ../x -> ../../../src/color/x
find packages/core/test/color/spaces -name '*.test.ts' -print0 \
  | xargs -0 sed -i '' -E 's|from "\.\./|from "../../../src/color/|g; s|from "\./|from "../../../src/color/spaces/|g'

grep -rhn 'from "' packages/core/test/color | grep -v 'bun:test' | sed -E 's/.*from "//; s/".*//' | sort -u
```

Expected: every path begins `../../src/color/` or `../../../src/color/`. No bare `./` or `../` relative imports remain apart from `bun:test`.

- [ ] **Step 5: Delete the stale `.d.ts` artifacts in core**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor
rm -f packages/core/src/index.d.ts \
      packages/core/src/gradient.d.ts \
      packages/core/src/geometry.d.ts \
      packages/core/src/color-spaces.d.ts \
      packages/core/src/env.d.ts
ls packages/core/src/*.d.ts 2>/dev/null || echo "NONE LEFT"
```

Expected: `NONE LEFT`.

- [ ] **Step 6: Drop `random` and the `color()` helper from the vendored barrel**

`packages/core/src/color/index.ts` was copied from upstream and still exports `./random`, which no longer exists. Open it and delete this line:

```ts
export { GOLDEN_ANGLE, goldenAngleHue, goldenHues, nextGoldenHue, randomColor } from "./random";
```

and change the `tagged` line from:

```ts
export { type ColorIn, color, type OklchColor, type P3Color, type SrgbColor } from "./tagged";
```

to types only — the runtime `color()` helper is not part of urcolor's surface:

```ts
export type { ColorIn, OklchColor, P3Color, SrgbColor } from "./tagged";
```

- [ ] **Step 7: Run the ported suite**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun test packages/core/test/color
```

Expected: all tests PASS, 0 fail. If a test fails here, the copy is wrong — fix the copy, do not edit the assertions.

- [ ] **Step 8: Confirm the pre-existing core tests still pass**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun test packages/core
```

Expected: PASS, including `color-spaces`, `geometry`, `gradient`, `i18n`.

- [ ] **Step 9: Commit**

```bash
git add packages/core/src/color packages/core/test/color
git add -u packages/core/src
git commit -m "feat(core): vendor zero-dependency color library from urvis

Copies the CSS Color 4 toolkit into packages/core/src/color with its test
suite. Import specifiers lose their .ts extensions to match core's
convention and to keep emitDeclarationOnly output resolvable. random.ts
is not ported; tagged.ts is kept as an internal type-only module.

Also removes stale checked-in .d.ts build artifacts from packages/core/src.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Add the `hsv` working space

**Files:**
- Create: `packages/core/src/color/spaces/hsv.ts`
- Create: `packages/core/test/color/spaces/hsv.test.ts`
- Modify: `packages/core/src/color/types.ts` (the `SpaceId` union)
- Modify: `packages/core/src/color/registry.ts` (the `SPACES` map)
- Modify: `packages/core/src/color/serialize.ts` (`SERIALIZERS`, `ColorFormat`)

**Interfaces:**
- Consumes: from Task 1 — `type Coords`, `type ColorObject`, `type SpaceId` (`./types`); `hslToSrgb(coords: Coords): Coords` (`./hsl`); `srgbToXyz(coords: Coords): Coords` and `srgbFromXyz(xyz: Coords): Coords` (`./xyz`); `serializeRgb(color: ColorObject): string` (`./srgb`); `convert` (`./convert`).
- Produces: `hsvToSrgb(coords: Coords): Coords`, `srgbToHsv(coords: Coords): Coords`, `hsvToXyz(coords: Coords): Coords`, `hsvFromXyz(xyz: Coords): Coords` from `./spaces/hsv`. `SpaceId` gains the member `"hsv"`. `ColorFormat` narrows to `Exclude<SpaceId, "hsv"> | "hex"`.

`hsv` is a working space for the picker components. It has no CSS notation, so it gets no parser and cannot be requested as an output format.

- [ ] **Step 1: Write the failing test**

Create `packages/core/test/color/spaces/hsv.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { Color } from "../../../src/color/color";
import { convert } from "../../../src/color/convert";
import { serialize } from "../../../src/color/serialize";
import type { ColorObject, Coords } from "../../../src/color/types";

const srgb = (coords: Coords): ColorObject => ({ space: "srgb", coords, alpha: 1 });

describe("hsv", () => {
  it("round-trips sRGB through HSV", () => {
    const samples: Coords[] = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
      [0.2, 0.6, 0.9],
      [0.75, 0.25, 0.5],
    ];
    for (const c of samples) {
      const back = convert(convert(srgb(c), "hsv"), "srgb");
      expect(back.coords[0]).toBeCloseTo(c[0], 6);
      expect(back.coords[1]).toBeCloseTo(c[1], 6);
      expect(back.coords[2]).toBeCloseTo(c[2], 6);
    }
  });

  it("converts known colors to the expected HSV coords", () => {
    // Pure red: h=0, s=1, v=1.
    const red = convert(srgb([1, 0, 0]), "hsv");
    expect(red.coords[0]).toBeCloseTo(0, 6);
    expect(red.coords[1]).toBeCloseTo(1, 6);
    expect(red.coords[2]).toBeCloseTo(1, 6);

    // Pure blue: h=240.
    const blue = convert(srgb([0, 0, 1]), "hsv");
    expect(blue.coords[0]).toBeCloseTo(240, 6);
  });

  it("gives achromatic colors zero saturation and hue", () => {
    const grey = convert(srgb([0.5, 0.5, 0.5]), "hsv");
    expect(grey.coords[0]).toBe(0);
    expect(grey.coords[1]).toBe(0);
    expect(grey.coords[2]).toBeCloseTo(0.5, 6);
  });

  it("handles black without dividing by zero", () => {
    const black = convert(srgb([0, 0, 0]), "hsv");
    expect(black.coords[0]).toBe(0);
    expect(black.coords[1]).toBe(0);
    expect(black.coords[2]).toBe(0);
    expect(Number.isNaN(black.coords[1])).toBe(false);
  });

  it("survives the 0/360 hue boundary", () => {
    const a = convert({ space: "hsv", coords: [0, 1, 1], alpha: 1 }, "srgb");
    const b = convert({ space: "hsv", coords: [360, 1, 1], alpha: 1 }, "srgb");
    expect(a.coords[0]).toBeCloseTo(b.coords[0], 6);
    expect(a.coords[1]).toBeCloseTo(b.coords[1], 6);
    expect(a.coords[2]).toBeCloseTo(b.coords[2], 6);
  });

  it("serialises as rgb(), since hsv has no CSS notation", () => {
    const c: ColorObject = { space: "hsv", coords: [0, 1, 1], alpha: 1 };
    expect(serialize(c)).toBe("rgb(255 0 0)");
    expect(new Color("hsv", [0, 1, 1]).toString()).toBe("rgb(255 0 0)");
  });

  it("carries alpha through the conversion", () => {
    const c = convert({ space: "srgb", coords: [1, 0, 0], alpha: 0.5 }, "hsv");
    expect(c.alpha).toBe(0.5);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun test packages/core/test/color/spaces/hsv.test.ts
```

Expected: FAIL. `convert` throws `RangeError: Unknown color space: hsv` (and TypeScript rejects `"hsv"` as a `SpaceId`).

- [ ] **Step 3: Write the space module**

Create `packages/core/src/color/spaces/hsv.ts`:

```ts
/**
 * HSV — hue, saturation, value. Coords are `[h(deg), s, v]` with `s`/`v` in
 * `0..1`. This is *not* a CSS Color 4 space: it has no CSS notation, so it has
 * no parser and cannot be named as a serialisation format. It exists as a
 * working space for colour pickers. Converts to the XYZ hub via sRGB.
 */

import type { Coords } from "../types";
import { hslToSrgb } from "./hsl";
import { srgbFromXyz, srgbToXyz } from "./xyz";

/** HSV `[h,s,v]` -> gamma sRGB `[r,g,b]`. */
export function hsvToSrgb([h, s, v]: Coords): Coords {
  // Reuse the HSL hue geometry for the fully-saturated base hue, then scale
  // toward `v` and lift by the achromatic floor `v * (1 - s)`.
  const base = hslToSrgb([h, 1, 0.5]);
  const min = v * (1 - s);
  const range = v - min;
  return [base[0] * range + min, base[1] * range + min, base[2] * range + min];
}

/** Gamma sRGB `[r,g,b]` -> HSV `[h,s,v]`. */
export function srgbToHsv([r, g, b]: Coords): Coords {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  // Black has no saturation; guard the division.
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}

/** HSV coords -> XYZ (D65). */
export function hsvToXyz(coords: Coords): Coords {
  return srgbToXyz(hsvToSrgb(coords));
}

/** XYZ (D65) -> HSV coords. */
export function hsvFromXyz(xyz: Coords): Coords {
  return srgbToHsv(srgbFromXyz(xyz));
}
```

- [ ] **Step 4: Add `hsv` to the `SpaceId` union**

In `packages/core/src/color/types.ts`, add the member after `"hsl"`:

```ts
export type SpaceId =
  | "srgb"
  | "srgb-linear"
  | "hsl"
  | "hsv"
  | "hwb"
  | "lab"
  | "lch"
  | "oklab"
  | "oklch"
  | "display-p3"
  | "a98-rgb"
  | "prophoto-rgb"
  | "rec2020"
  | "xyz-d65"
  | "xyz-d50";
```

- [ ] **Step 5: Register the space**

In `packages/core/src/color/registry.ts`, add the import beside the `hsl` one:

```ts
import { hsvFromXyz, hsvToSrgb, hsvToXyz, srgbToHsv } from "./spaces/hsv";
```

and add the entry to `SPACES`, directly after `hsl`:

```ts
  hsv: {
    channels: ["h", "s", "v"],
    hueIndex: 0,
    toXyz: hsvToXyz,
    fromXyz: hsvFromXyz,
    toSrgb: hsvToSrgb,
    fromSrgb: srgbToHsv,
  },
```

- [ ] **Step 6: Teach the serialiser about `hsv`**

`SERIALIZERS` is a `Record<SpaceId, Serializer>`, so adding `hsv` to `SpaceId` makes it incomplete — TypeScript will flag it. In `packages/core/src/color/serialize.ts`, change the `ColorFormat` type and add the entry.

Replace:

```ts
/** Output format: any space id, or `"hex"` for `#rrggbb[aa]`. */
export type ColorFormat = SpaceId | "hex";
```

with:

```ts
/**
 * Output format: any space id with a CSS notation, or `"hex"` for
 * `#rrggbb[aa]`. `hsv` is excluded — it has no CSS form, and an `hsv` color
 * serialises down to `rgb()` instead.
 */
export type ColorFormat = Exclude<SpaceId, "hsv"> | "hex";
```

and add to the `SERIALIZERS` map, after the `hsl` entry:

```ts
  // hsv has no CSS notation; fall back to sRGB.
  hsv: (color) => serializeRgb(convert(color, "srgb")),
```

- [ ] **Step 7: Run the test to confirm it passes**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun test packages/core/test/color/spaces/hsv.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 8: Run the full core suite for regressions**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun test packages/core
```

Expected: PASS. `wideGamut.test.ts` and `gamut.test.ts` in particular exercise `SPACES` exhaustively.

- [ ] **Step 9: Commit**

```bash
git add packages/core/src/color packages/core/test/color/spaces/hsv.test.ts
git commit -m "feat(core): add hsv working space

hsv is not a CSS Color 4 space, so it gets no parser and is excluded from
ColorFormat; an hsv color serialises down to rgb(). It exists as a working
space for the picker components, reachable via .to(\"hsv\").

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Extend the `Color` class for urcolor's call sites

**Files:**
- Modify: `packages/core/src/color/color.ts`
- Create: `packages/core/test/color/color-urcolor.test.ts`

**Interfaces:**
- Consumes: from Task 1 — `Color`, `tryParse`, `convert`, `spaceDef`; from Task 2 — the `"hsv"` `SpaceId`.
- Produces: two additions to `Color`:
  - `static parse(input: string): Color | null`
  - `with(patch: ColorPatch): Color` where `ColorPatch = { space?: SpaceId; alpha?: number } & Record<string, number | SpaceId | undefined>` — when `patch.space` is set, the color converts to that space before the channel values are applied.

Downstream has 34 sites that treat a parse failure as a value, and 20 sites that convert-and-set in one call (`ic`'s `.set({ mode, ...channels })`). These two additions are what let those sites migrate 1:1.

- [ ] **Step 1: Write the failing test**

Create `packages/core/test/color/color-urcolor.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { Color } from "../../src/color/color";

describe("Color.parse", () => {
  it("returns a Color for valid input", () => {
    const c = Color.parse("#ff0000");
    expect(c).not.toBeNull();
    expect(c?.space).toBe("srgb");
    expect(c?.get("r")).toBeCloseTo(1, 6);
  });

  it("returns null for unparseable input", () => {
    expect(Color.parse("not-a-color")).toBeNull();
    expect(Color.parse("")).toBeNull();
    expect(Color.parse("#gggggg")).toBeNull();
  });

  it("does not throw where from() would", () => {
    expect(() => Color.parse("garbage")).not.toThrow();
    expect(() => Color.from("garbage")).toThrow();
  });
});

describe("Color#with", () => {
  it("sets channels in the current space", () => {
    const c = Color.from("hsl(210 80% 50%)").with({ l: 0.25 });
    expect(c.space).toBe("hsl");
    expect(c.get("h")).toBeCloseTo(210, 6);
    expect(c.get("l")).toBeCloseTo(0.25, 6);
  });

  it("converts first when given a target space", () => {
    const c = Color.from("hsl(210 80% 50%)").with({ space: "hsv", v: 0.4 });
    expect(c.space).toBe("hsv");
    expect(c.get("v")).toBeCloseTo(0.4, 6);
    // Hue survives the hsl -> hsv conversion.
    expect(c.get("h")).toBeCloseTo(210, 4);
  });

  it("converts with no channel overrides", () => {
    const c = Color.from("#ff0000").with({ space: "oklch" });
    expect(c.space).toBe("oklch");
    expect(c.get("h")).toBeCloseTo(Color.from("#ff0000").to("oklch").get("h"), 6);
  });

  it("sets alpha alongside a space change", () => {
    const c = Color.from("#ff0000").with({ space: "hsl", alpha: 0.5 });
    expect(c.space).toBe("hsl");
    expect(c.alpha).toBe(0.5);
  });

  it("validates channels against the target space", () => {
    // `v` exists in hsv but not hsl.
    expect(() => Color.from("#ff0000").with({ space: "hsl", v: 0.5 })).toThrow(RangeError);
    expect(() => Color.from("#ff0000").with({ space: "hsv", v: 0.5 })).not.toThrow();
  });

  it("leaves the receiver unchanged", () => {
    const a = Color.from("hsl(210 80% 50%)");
    a.with({ space: "hsv", v: 0.4 });
    expect(a.space).toBe("hsl");
    expect(a.get("l")).toBeCloseTo(0.5, 6);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun test packages/core/test/color/color-urcolor.test.ts
```

Expected: FAIL — `Color.parse is not a function`, and the `space:`-carrying `with()` cases throw `RangeError: No channel "space" in srgb`.

- [ ] **Step 3: Widen `ColorPatch` and add the `parse` static**

In `packages/core/src/color/color.ts`, replace the `ColorPatch` type:

```ts
/** A `with()` patch: any subset of the current space's channels, plus alpha. */
export type ColorPatch = Record<string, number>;
```

with one that admits an optional target space:

```ts
/**
 * A `with()` patch: any subset of a space's channels, plus `alpha`, plus an
 * optional `space` to convert into *before* the channels are applied.
 */
export type ColorPatch = {
  space?: SpaceId;
  alpha?: number;
} & Record<string, number | SpaceId | undefined>;
```

Add `tryParse` to the existing `parse` import at the top of the file:

```ts
import { parse, tryParse } from "./parse";
```

Then add the static, directly below the existing `static from(...)`:

```ts
  /**
   * Parse a CSS color string, or `null` when it isn't one. The nullable
   * counterpart to {@link Color.from}, which throws.
   */
  static parse(input: string): Color | null {
    const o = tryParse(input);
    return o === null ? null : new Color(o.space, o.coords, o.alpha);
  }
```

- [ ] **Step 4: Make `with()` honour `patch.space`**

Replace the existing `with()` method body:

```ts
  /** Copy with the given channels and/or `alpha` overridden. */
  with(patch: ColorPatch): Color {
    const { channels } = spaceDef(this.space);
    const coords = this.coords;
    for (const [key, value] of Object.entries(patch)) {
      if (key === "alpha") continue;
      const i = channels.indexOf(key);
      if (i < 0) throw new RangeError(`No channel "${key}" in ${this.space}`);
      coords[i] = value;
    }
    return new Color(this.space, coords, patch.alpha ?? this.alpha);
  }
```

with:

```ts
  /**
   * Copy with the given channels and/or `alpha` overridden. When `patch.space`
   * is present the color is converted into that space first, and the channel
   * names are resolved against it — a convert-and-set in one call.
   */
  with(patch: ColorPatch): Color {
    const target = patch.space ?? this.space;
    const base = target === this.space ? this : this.to(target);
    const { channels } = spaceDef(target);
    const coords = base.coords;
    for (const [key, value] of Object.entries(patch)) {
      if (key === "space" || key === "alpha" || value === undefined) continue;
      const i = channels.indexOf(key);
      if (i < 0) throw new RangeError(`No channel "${key}" in ${target}`);
      coords[i] = value as number;
    }
    return new Color(target, coords, patch.alpha ?? base.alpha);
  }
```

- [ ] **Step 5: Run the test to confirm it passes**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun test packages/core/test/color/color-urcolor.test.ts
```

Expected: PASS, 10 tests.

- [ ] **Step 6: Run the full core suite**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun test packages/core
```

Expected: PASS. `color.test.ts` from upstream covers the old `with()` behaviour and must still be green.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/color/color.ts packages/core/test/color/color-urcolor.test.ts
git commit -m "feat(core): add Color.parse and space-aware Color#with

Color.parse is the nullable counterpart to from(). with({ space, ...channels })
converts before applying channels, resolving channel names against the target
space. Both exist to give urcolor's picker components a 1:1 migration off
internationalized-color.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Export the library from the package root

**Files:**
- Modify: `packages/core/src/index.ts`
- Create: `packages/core/test/exports.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1-3.
- Produces: the public `@urcolor/core` surface. Tasks 5-9 import from `"@urcolor/core"` and rely on these names being present.

- [ ] **Step 1: Write the failing test**

Create `packages/core/test/exports.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import * as core from "../src/index";

describe("@urcolor/core exports", () => {
  it("exposes the color library", () => {
    for (const name of [
      "Color",
      "parse",
      "tryParse",
      "serialize",
      "convert",
      "gamutMap",
      "inGamut",
      "interpolate",
      "mix",
      "lighten",
      "darken",
      "saturate",
      "desaturate",
      "rotateHue",
      "negate",
      "complement",
      "alpha",
      "deltaE",
      "deltaEOK",
      "contrast",
      "NAMED_COLORS",
      "parseNamed",
      "SPACES",
      "spaceDef",
      "hueIndexOf",
    ]) {
      expect(core).toHaveProperty(name);
    }
  });

  it("still exposes the gradient, geometry, space-config and i18n surface", () => {
    for (const name of [
      "drawGradient",
      "sampleChannelGrid",
      "polarToCartesian",
      "colorSpaces",
      "getChannelConfig",
      "translations",
      "getChannelLabel",
    ]) {
      expect(core).toHaveProperty(name);
    }
  });

  it("round-trips a color through the public surface", () => {
    expect(core.Color.parse("#ff0000")?.to("hsl").toString()).toBe("hsl(0 100% 50%)");
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun test packages/core/test/exports.test.ts
```

Expected: FAIL — the first assertion, `expect(core).toHaveProperty("Color")`.

- [ ] **Step 3: Re-export the library from the root barrel**

Replace the whole of `packages/core/src/index.ts` with:

```ts
// Color library (vendored; zero dependencies).
export { Color, type ColorPatch } from "./color/color";
export { parse, tryParse } from "./color/parse";
export { serialize, type ColorFormat } from "./color/serialize";
export { convert } from "./color/convert";
export { gamutMap, inGamut } from "./color/gamut";
export { interpolate, mix, type HueMethod, type InterpolateOptions, type MixOptions } from "./color/interpolate";
export { alpha, complement, darken, desaturate, lighten, negate, rotateHue, saturate } from "./color/manipulate";
export { deltaE, deltaEOK, type DeltaEMethod } from "./color/deltaE";
export { contrast, type ContrastAlgorithm, type ContrastOptions } from "./color/contrast";
export { NAMED_COLORS, parseNamed } from "./color/named";
export { SPACES, spaceDef, hueIndexOf } from "./color/registry";
export type { ColorIn, OklchColor, P3Color, SrgbColor } from "./color/tagged";
export type { ColorObject, Coords, SpaceDef, SpaceId } from "./color/types";

// Gradient rendering.
export { drawGradient, drawLinearGradient, interpolateStops, sampleBilinearGrid, sampleChannelGrid, sampleTriangleGrid, samplePolarGrid, sampleConicRing } from "./gradient";

// Geometry helpers.
export { polarToCartesian, cartesianToPolar, clampToCircle, normalizeAngle, triangleVertices, barycentricCoords, barycentricToCartesian, pointInTriangle, clampToTriangle, insetTriangle, type Point, type PolarCoord } from "./geometry";

// Color-space UI configuration.
// NOTE: displayToCulori / culoriToDisplay are renamed to displayToNative /
// nativeToDisplay in Task 5. Keep the old names here until then.
export { colorSpaces, getChannelConfig, displayToCulori, culoriToDisplay, type ChannelConfig, type ColorSpaceConfig } from "./color-spaces";

// Channel-label translations.
export { translations, getChannelLabel, type ChannelTranslations } from "./i18n";
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun test packages/core/test/exports.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Run the full core suite**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun test packages/core
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/index.ts packages/core/test/exports.test.ts
git commit -m "feat(core): re-export the vendored color library from the root

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Move `color-spaces.ts` to CSS space ids

**Files:**
- Modify: `packages/core/src/color-spaces.ts`
- Modify: `packages/core/test/color-spaces.test.ts`
- Modify: `packages/core/src/index.ts` (flip to the new names)

**Interfaces:**
- Consumes: `type SpaceId` from `./color/types` (Task 2's union, including `hsv`).
- Produces:
  - `interface ChannelConfig { key: string; label: string; min: number; max: number; step: number; format: "number" | "degree" | "percentage"; nativeMin?: number; nativeMax?: number }`
  - `interface ColorSpaceConfig { space: SpaceId; label: string; channels: ChannelConfig[] }`
  - `colorSpaces: Record<SpaceId, ColorSpaceConfig>` keyed by CSS ids
  - `displayToNative(config: ChannelConfig, displayValue: number): number`
  - `nativeToDisplay(config: ChannelConfig, nativeValue: number): number`
  - `getChannelConfig(...)` — signature unchanged

Tasks 6-9 consume `spaceConfig.space` (not `.mode`) and `displayToNative` / `nativeToDisplay`.

- [ ] **Step 1: Update the test to expect the new ids and names**

In `packages/core/test/color-spaces.test.ts`, change the import to the new function names:

```ts
import {
  colorSpaces,
  getChannelConfig,
  displayToNative,
  nativeToDisplay,
  type ChannelConfig,
} from "../src/color-spaces";
```

Update the id assertions:

```ts
  it("contains expected color spaces", () => {
    const keys = Object.keys(colorSpaces);
    expect(keys).toContain("hsl");
    expect(keys).toContain("hsv");
    expect(keys).toContain("srgb");
    expect(keys).toContain("oklch");
    expect(keys).toContain("oklab");
    expect(keys).toContain("display-p3");
  });

  it("uses no culori-era space ids", () => {
    const keys = Object.keys(colorSpaces);
    for (const stale of ["rgb", "p3", "a98", "prophoto"]) {
      expect(keys).not.toContain(stale);
    }
  });
```

Then replace every remaining occurrence of `displayToCulori` with `displayToNative`, `culoriToDisplay` with `nativeToDisplay`, `culoriMin` with `nativeMin`, `culoriMax` with `nativeMax`, and `.mode` with `.space` throughout the file:

```bash
cd /Users/grandmagus/Documents/Projects/urcolor
sed -i '' -E 's/displayToCulori/displayToNative/g; s/culoriToDisplay/nativeToDisplay/g; s/culoriMin/nativeMin/g; s/culoriMax/nativeMax/g' packages/core/test/color-spaces.test.ts
grep -n 'mode' packages/core/test/color-spaces.test.ts
```

Change each `mode` hit that refers to `ColorSpaceConfig.mode` to `space`. (Leave any unrelated word alone.)

- [ ] **Step 2: Run it to confirm it fails**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun test packages/core/test/color-spaces.test.ts
```

Expected: FAIL — `displayToNative` is not exported; the `srgb`/`display-p3` key assertions fail.

- [ ] **Step 3: Rewrite the module's types and helpers**

In `packages/core/src/color-spaces.ts`, add the import at the top:

```ts
import type { SpaceId } from "./color/types";
```

Rename the two optional `ChannelConfig` fields:

```ts
  /** Native internal minimum (defaults to `min` when unset) */
  nativeMin?: number;
  /** Native internal maximum (defaults to `max` when unset) */
  nativeMax?: number;
```

Change `ColorSpaceConfig`:

```ts
export interface ColorSpaceConfig {
  /** CSS Color 4 space identifier */
  space: SpaceId;
  /** Human-readable label */
  label: string;
  /** Channel definitions */
  channels: ChannelConfig[];
}
```

Rename the two conversion functions and their internals:

```bash
cd /Users/grandmagus/Documents/Projects/urcolor
sed -i '' -E 's/displayToCulori/displayToNative/g; s/culoriToDisplay/nativeToDisplay/g; s/culoriMin/nativeMin/g; s/culoriMax/nativeMax/g; s/culoriValue/nativeValue/g' packages/core/src/color-spaces.ts
grep -n 'culori' packages/core/src/color-spaces.ts || echo "NO CULORI REFS"
```

Expected: `NO CULORI REFS`. (If a doc comment still says "culori", reword it to "native".)

- [ ] **Step 4: Retype and rekey the `colorSpaces` map**

Change the declaration:

```ts
export const colorSpaces: Record<SpaceId, ColorSpaceConfig> = {
```

Rename every key and its `mode:` field to `space:` with the CSS id:

| old key / `mode` | new key / `space` |
| --- | --- |
| `hsl` | `hsl` |
| `hsv` | `hsv` |
| `hwb` | `hwb` |
| `oklch` | `oklch` |
| `oklab` | `oklab` |
| `lch` | `lch` |
| `lab` | `lab` |
| `rgb` | `srgb` |
| `p3` | `display-p3` |
| `a98` | `a98-rgb` |
| `prophoto` | `prophoto-rgb` |
| `rec2020` | `rec2020` |

So, for example, the `rgb` entry becomes:

```ts
  srgb: {
    space: "srgb",
    label: "RGB",
    channels: [ /* unchanged */ ],
  },
```

`Record<SpaceId, ColorSpaceConfig>` is exhaustive, so TypeScript would demand entries for `srgb-linear`, `xyz-d65`, and `xyz-d50`, which the UI does not offer. Use a partial record rather than inventing configs for them:

```ts
export const colorSpaces: Partial<Record<SpaceId, ColorSpaceConfig>> = {
```

`getChannelConfig` at line 180 already handles the optional index access with `?.`; only its parameter type changes. Replace:

```ts
export function getChannelConfig(colorSpace: string, channel: string): ChannelConfig | undefined {
  return colorSpaces[colorSpace]?.channels.find(c => c.key === channel);
}
```

with:

```ts
export function getChannelConfig(colorSpace: SpaceId, channel: string): ChannelConfig | undefined {
  return colorSpaces[colorSpace]?.channels.find(c => c.key === channel);
}
```

- [ ] **Step 5: Flip the root barrel to the new names**

In `packages/core/src/index.ts`, change the `color-spaces` line back to what Task 4 intended:

```ts
export { colorSpaces, getChannelConfig, displayToNative, nativeToDisplay, type ChannelConfig, type ColorSpaceConfig } from "./color-spaces";
```

- [ ] **Step 6: Run the tests to confirm they pass**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun test packages/core
```

Expected: PASS. `gradient.test.ts` may still reference old ids — if so, update its literals to CSS ids too; that file is migrated properly in Task 6.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/color-spaces.ts packages/core/src/index.ts packages/core/test
git commit -m "refactor(core)!: key color-spaces config by CSS Color 4 space ids

BREAKING CHANGE: colorSpaces keys and ColorSpaceConfig.space use CSS Color 4
ids (srgb, display-p3, a98-rgb, prophoto-rgb) instead of culori mode strings
(rgb, p3, a98, prophoto). ColorSpaceConfig.mode is renamed to .space.
displayToCulori/culoriToDisplay become displayToNative/nativeToDisplay, and
ChannelConfig.culoriMin/.culoriMax become .nativeMin/.nativeMax.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Migrate `gradient.ts` off `internationalized-color`

**Files:**
- Modify: `packages/core/src/gradient.ts`
- Modify: `packages/core/test/gradient.test.ts`
- Modify: `packages/core/package.json`

**Interfaces:**
- Consumes: `Color`, `type SpaceId` from the vendored library; `displayToNative` from Task 5.
- Produces: gradient functions whose `colorSpace` / `space` parameters are typed `SpaceId` rather than `string`. Tasks 7-8 call these with CSS ids.

`gradient.ts` is the only file in `packages/core/src` that imports `internationalized-color`. After this task, `packages/core` has zero runtime dependencies.

- [ ] **Step 1: Replace the imports**

At the top of `packages/core/src/gradient.ts`, delete both lines:

```ts
import "internationalized-color/css";
import { Color } from "internationalized-color";
```

and put in their place:

```ts
import { Color } from "./color/color";
import type { SpaceId } from "./color/types";
```

The `/css` side-effect import is gone for good — the vendored registry needs no bootstrapping.

- [ ] **Step 2: Migrate `colorToVec4`**

`.to()` no longer returns `null`, and `.get()` needs no default. Replace:

```ts
function colorToVec4(color: Color, alpha = false): [number, number, number, number] {
  const rgb = color.to("rgb");
  if (!rgb) throw new Error(`Cannot convert ${color.mode} to rgb`);
  return [
    rgb.get("r", 0),
    rgb.get("g", 0),
    rgb.get("b", 0),
    alpha ? (rgb.alpha ?? 1) : 1,
  ];
}
```

with:

```ts
function colorToVec4(color: Color, alpha = false): [number, number, number, number] {
  const rgb = color.to("srgb");
  return [rgb.get("r"), rgb.get("g"), rgb.get("b"), alpha ? rgb.alpha : 1];
}
```

- [ ] **Step 3: Migrate `interpolateStops`**

`mix()`'s third argument is now an options object, and the result is non-nullable. Replace:

```ts
export function interpolateStops(colors: Color[], steps: number, space: string): Color[] {
  if (colors.length < 2) return [...colors];
  const result: Color[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const segment = t * (colors.length - 1);
    const idx = Math.min(Math.floor(segment), colors.length - 2);
    const localT = segment - idx;
    const a = colors[idx]!;
    const b = colors[idx + 1]!;
    const mixed = a.mix(b, localT, space);
    if (mixed) {
      const rgb = mixed.to("rgb");
      result.push(rgb ?? mixed);
    }
  }
  return result;
}
```

with:

```ts
export function interpolateStops(colors: Color[], steps: number, space: SpaceId): Color[] {
  if (colors.length < 2) return [...colors];
  const result: Color[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const segment = t * (colors.length - 1);
    const idx = Math.min(Math.floor(segment), colors.length - 2);
    const localT = segment - idx;
    const a = colors[idx]!;
    const b = colors[idx + 1]!;
    result.push(a.mix(b, localT, { space }).to("srgb"));
  }
  return result;
}
```

- [ ] **Step 4: Migrate the four grid samplers**

`sampleChannelGrid`, `sampleTriangleGrid`, `samplePolarGrid`, and `sampleConicRing` all follow the same shape. In each:

1. Change the `colorSpace: string` parameter to `colorSpace: SpaceId`.
2. Change `baseColor.set({ mode: colorSpace, ... })` to `baseColor.with({ space: colorSpace, ... })`.
3. Delete the `if (!c) continue;` guard that followed it — `with()` does not return null.
4. Change `c.to("rgb")` to `c.to("srgb")` and delete the `if (!rgb) continue;` guard.
5. Change `rgb.get("r", 0)` to `rgb.get("r")`, and likewise for `g` and `b`.
6. Change `(rgb.alpha ?? 1)` to `rgb.alpha`.

So a block that read:

```ts
      const c = baseColor.set({
        mode: colorSpace,
        [xChannel]: xVal,
        [yChannel]: yVal,
      });
      if (!c) continue;
      const rgb = c.to("rgb");
      if (!rgb) continue;
      const idx = (y * w + x) * 4;
      data[idx] = Math.round(Math.max(0, Math.min(1, rgb.get("r", 0))) * 255);
      data[idx + 1] = Math.round(Math.max(0, Math.min(1, rgb.get("g", 0))) * 255);
      data[idx + 2] = Math.round(Math.max(0, Math.min(1, rgb.get("b", 0))) * 255);
      data[idx + 3] = alpha ? Math.round((rgb.alpha ?? 1) * 255) : 255;
```

becomes:

```ts
      const rgb = baseColor
        .with({ space: colorSpace, [xChannel]: xVal, [yChannel]: yVal })
        .to("srgb");
      const idx = (y * w + x) * 4;
      data[idx] = Math.round(Math.max(0, Math.min(1, rgb.get("r"))) * 255);
      data[idx + 1] = Math.round(Math.max(0, Math.min(1, rgb.get("g"))) * 255);
      data[idx + 2] = Math.round(Math.max(0, Math.min(1, rgb.get("b"))) * 255);
      data[idx + 3] = alpha ? Math.round(rgb.alpha * 255) : 255;
```

Apply the same transformation to the `.set({ mode: colorSpace, ...updates })` call in `sampleTriangleGrid`, the `.set({ mode: colorSpace, [angleChannel]: …, [radiusChannel]: … })` call in `samplePolarGrid`, and the `.set({ mode: colorSpace, [channel]: val })` call in `sampleConicRing`. Also change `sampleBilinearGrid`'s `space: string` parameter to `space: SpaceId`.

- [ ] **Step 5: Verify no old API remains in the file**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor
grep -n 'internationalized-color\|\.set({\|"rgb"\|\.mode\|get("[rgb]", 0)' packages/core/src/gradient.ts || echo "CLEAN"
```

Expected: `CLEAN`.

- [ ] **Step 6: Update the gradient tests**

In `packages/core/test/gradient.test.ts`, change the `internationalized-color` import to `../src/color/color`, drop any `import "internationalized-color/css";` line, replace `Color.parse(...)!` usages as needed (the signature is the same, returning `null` instead of `undefined`), and change any `"rgb"` / `"p3"` space literal to `"srgb"` / `"display-p3"`.

```bash
cd /Users/grandmagus/Documents/Projects/urcolor
grep -n 'internationalized-color\|"rgb"\|"p3"\|"a98"\|"prophoto"' packages/core/test/gradient.test.ts
```

Fix each hit, then confirm:

```bash
grep -n 'internationalized-color' packages/core/test/gradient.test.ts || echo "CLEAN"
```

Expected: `CLEAN`.

- [ ] **Step 7: Empty the package's dependencies**

In `packages/core/package.json`, replace:

```json
  "dependencies": {
    "internationalized-color": "1.1.1"
  }
```

with:

```json
  "dependencies": {}
```

- [ ] **Step 8: Run the core suite and build**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun test packages/core && bun run --cwd packages/core build
```

Expected: tests PASS; build emits `packages/core/dist/index.js` and `dist/index.d.ts` with no errors.

- [ ] **Step 9: Confirm the emitted types are self-contained**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor
grep -rn 'internationalized-color\|\.ts"' packages/core/dist/*.d.ts || echo "CLEAN"
```

Expected: `CLEAN` — no dangling `.ts` specifiers, no reference to the removed dependency.

- [ ] **Step 10: Commit**

```bash
git add packages/core
git commit -m "refactor(core)!: migrate gradient rendering to the vendored color library

BREAKING CHANGE: gradient functions now take SpaceId rather than string for
their color-space parameters. packages/core has no runtime dependencies.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Migrate `packages/vue`

**Files:**
- Modify: every file under `packages/vue/src` that references `internationalized-color` (composables `useColor.ts`, `useColorSpace.ts`; the `ColorArea`, `ColorField`, `ColorRing`, `ColorSlider`, `ColorSwatch`, `ColorSwatchGroup`, `ColorTriangle`, `ColorWheel` component and story files)
- Modify: `packages/vue/package.json`

**Interfaces:**
- Consumes: `Color`, `type SpaceId`, `displayToNative`, `nativeToDisplay`, `getChannelConfig`, `colorSpaces`, and the gradient samplers — all from `@urcolor/core`.
- Produces: no new interfaces; the Vue components' public props keep their names, but `color-space` prop values are now CSS ids.

- [ ] **Step 1: List every file to touch**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor
grep -rl 'internationalized-color' packages/vue/src | sort
```

Keep this list; every file on it must come out clean by Step 6.

- [ ] **Step 2: Rewrite the imports**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor
# Drop the CSS bootstrap side-effect import entirely.
grep -rl 'internationalized-color/css' packages/vue/src \
  | xargs sed -i '' -E '/^import ["'"'"']internationalized-color\/css["'"'"'];?$/d'
# Repoint the Color import.
grep -rl 'internationalized-color' packages/vue/src \
  | xargs sed -i '' -E 's|from "internationalized-color"|from "@urcolor/core"|g'

grep -rn 'internationalized-color' packages/vue/src || echo "CLEAN"
```

Expected: `CLEAN`.

- [ ] **Step 3: Migrate the `Color` API call sites**

Work through each file and apply this mapping. There is no safe blanket `sed` for these — `.set(` also appears on `Map` instances (e.g. `packages/vue/src/components/ColorArea/utils.ts:213` calls `itemMap.value.set(...)`, which must NOT be touched).

| old | new |
| --- | --- |
| `.set({ mode: X, ...rest })` | `.with({ space: X, ...rest })` |
| `.set({ alpha: n })` | `.withAlpha(n)` |
| `.set({ mode: X, alpha: n })` | `.with({ space: X, alpha: n })` |
| `.toHex()` | `.toString("hex")` |
| `.to(X)` returning nullable | `.to(X)` returning `Color` — delete the `?.` / `?? fallback` |
| `.mode` | `.space` |
| `.get("r", 0)` | `.get("r")` |
| `.alpha ?? 1` | `.alpha` |
| `Color.parse(v) ?? undefined` | `Color.parse(v) ?? undefined` (unchanged — `null` also falls through `??`) |
| `spaceConfig.mode` | `spaceConfig.space` |
| `displayToCulori(...)` | `displayToNative(...)` |
| `culoriToDisplay(...)` | `nativeToDisplay(...)` |

Concretely, `packages/vue/src/composables/useColorSpace.ts` goes from:

```ts
          const converted = color.value.to(spaceConfig.mode);
          ...
          color.value = markRaw(color.value.set({
```

to:

```ts
          const converted = color.value.to(spaceConfig.space);
          ...
          color.value = markRaw(color.value.with({
```

and `packages/vue/src/composables/useColor.ts` from:

```ts
    get: () => color.value.toHex() ?? "#000000",
    ...
      color.value = markRaw(color.value.set({ alpha: v / 100 }));
```

to:

```ts
    get: () => color.value.toString("hex"),
    ...
      color.value = markRaw(color.value.withAlpha(v / 100));
```

- [ ] **Step 4: Update space-id literals**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor
grep -rn '"rgb"\|'"'"'rgb'"'"'\|"p3"\|"a98"\|"prophoto"' packages/vue/src
```

Change each to its CSS id (`srgb`, `display-p3`, `a98-rgb`, `prophoto-rgb`) — this covers `color-space` prop defaults, Storybook `argTypes` option lists, and any `to(...)` argument. Re-run the grep until it is empty.

- [ ] **Step 5: Point the package at core**

In `packages/vue/package.json`, remove `internationalized-color` from `dependencies` / `peerDependencies` if present, and confirm `@urcolor/core` is listed as a dependency (`"@urcolor/core": "workspace:*"` if it is not already).

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && cat packages/vue/package.json
```

- [ ] **Step 6: Typecheck and test**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun install && bunx vue-tsc --noEmit && bun test packages/vue
```

Expected: no type errors; tests PASS. `vue-tsc` is the real gate here — `SpaceId` being a union means a stale `"rgb"` literal is a compile error, not a silent runtime bug.

- [ ] **Step 7: Build the package**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun run --cwd packages/vue build
```

Expected: builds clean.

- [ ] **Step 8: Commit**

```bash
git add packages/vue
git commit -m "refactor(vue)!: migrate from internationalized-color to @urcolor/core

BREAKING CHANGE: color-space prop values use CSS Color 4 ids (srgb,
display-p3, a98-rgb, prophoto-rgb) instead of culori mode strings. Consumers
constructing Color directly should import it from @urcolor/core; Color.parse
now returns null rather than undefined, .set({ mode }) becomes
.with({ space }), and .toHex() becomes .toString(\"hex\").

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Migrate `packages/react`

**Files:**
- Modify: every file under `packages/react/src` that references `internationalized-color` (the `color-area`, `color-field`, `color-ring`, `color-slider`, `color-swatch`, `color-swatch-group`, `color-triangle`, `color-wheel` component, context, hook, and story files)
- Modify: `packages/react/package.json`

**Interfaces:**
- Consumes: identical to Task 7 — `Color`, `type SpaceId`, `displayToNative`, `nativeToDisplay`, `getChannelConfig`, `colorSpaces`, gradient samplers, all from `@urcolor/core`.
- Produces: no new interfaces.

This is the same migration as Task 7 against the React tree. The mapping table is repeated in full below — do not go back to Task 7 for it.

- [ ] **Step 1: List every file to touch**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor
grep -rl 'internationalized-color' packages/react/src | sort
```

- [ ] **Step 2: Rewrite the imports**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor
grep -rl 'internationalized-color/css' packages/react/src \
  | xargs sed -i '' -E '/^import ["'"'"']internationalized-color\/css["'"'"'];?$/d'
grep -rl 'internationalized-color' packages/react/src \
  | xargs sed -i '' -E 's|from "internationalized-color"|from "@urcolor/core"|g'

grep -rn 'internationalized-color' packages/react/src || echo "CLEAN"
```

Expected: `CLEAN`.

- [ ] **Step 3: Migrate the `Color` API call sites**

| old | new |
| --- | --- |
| `.set({ mode: X, ...rest })` | `.with({ space: X, ...rest })` |
| `.set({ alpha: n })` | `.withAlpha(n)` |
| `.set({ mode: X, alpha: n })` | `.with({ space: X, alpha: n })` |
| `.toHex()` | `.toString("hex")` |
| `.to(X)` returning nullable | `.to(X)` returning `Color` — delete the `?.` / `?? fallback` |
| `.mode` | `.space` |
| `.get("r", 0)` | `.get("r")` |
| `.alpha ?? 1` | `.alpha` |
| `spaceConfig.mode` | `spaceConfig.space` |
| `displayToCulori(...)` | `displayToNative(...)` |
| `culoriToDisplay(...)` | `nativeToDisplay(...)` |

Again: `.set(` may also be a `Map#set` or a React state setter. Read each hit before changing it.

- [ ] **Step 4: Update space-id literals**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor
grep -rn '"rgb"\|'"'"'rgb'"'"'\|"p3"\|"a98"\|"prophoto"' packages/react/src
```

Change each to `srgb` / `display-p3` / `a98-rgb` / `prophoto-rgb`. Re-run until empty.

- [ ] **Step 5: Point the package at core**

In `packages/react/package.json`, remove `internationalized-color` and confirm `@urcolor/core` is a dependency.

- [ ] **Step 6: Typecheck, test, build**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun install && bunx tsc --noEmit -p tsconfig.json && bun test packages/react && bun run --cwd packages/react build
```

Expected: no type errors, tests PASS, build clean.

- [ ] **Step 7: Commit**

```bash
git add packages/react
git commit -m "refactor(react)!: migrate from internationalized-color to @urcolor/core

BREAKING CHANGE: color-space prop values use CSS Color 4 ids (srgb,
display-p3, a98-rgb, prophoto-rgb) instead of culori mode strings. Consumers
constructing Color directly should import it from @urcolor/core; Color.parse
now returns null rather than undefined, .set({ mode }) becomes
.with({ space }), and .toHex() becomes .toString(\"hex\").

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Migrate the docs and delete the color-naming feature

**Files:**
- Modify: `docs/guide/vue/demo/*.vue`, `docs/guide/react/demo/*.tsx`, `docs/components/vue/demo/*.vue`
- Modify: `docs/guide/vue/*.md`, `docs/guide/react/*.md`
- Modify: `docs/.vitepress/components/HeroDemo.vue`, `docs/.vitepress/components/FeaturesGrid.vue`
- Modify: `docs/components/vue/demo/FullPreview.vue`
- Modify: `docs/guide/features.md`, `docs/guide/index.md`
- Modify: `docs/.vitepress/config.ts`

**Interfaces:**
- Consumes: `Color` and the component packages, as migrated in Tasks 7-8.
- Produces: nothing consumed by later tasks.

Two docs components use the color-*naming* feature, which is being deleted outright rather than reimplemented. Core's `src/i18n/` channel-label translations are a different feature and survive — the features page is rewritten around them.

- [ ] **Step 1: Rewrite the demo imports**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor
grep -rl 'internationalized-color/css' docs \
  | xargs sed -i '' -E '/^import ["'"'"']internationalized-color\/css["'"'"'];?( \/\/.*)?$/d'
grep -rl 'from "internationalized-color"' docs \
  | xargs sed -i '' -E 's|from "internationalized-color"|from "@urcolor/core"|g'

grep -rn 'internationalized-color' docs || echo "REMAINING ABOVE"
```

Expected remaining hits: only `HeroDemo.vue`, `FullPreview.vue` (the `/locales` imports), `FeaturesGrid.vue`, `features.md`, `index.md`, and `.vitepress/config.ts` — handled in the steps below.

- [ ] **Step 2: Strip color naming from `HeroDemo.vue`**

In `docs/.vitepress/components/HeroDemo.vue`, delete these lines:

```ts
import { Color, nameColor, useLocale } from "internationalized-color";
import * as allLocales from "internationalized-color/locales";
...
Object.values(allLocales).forEach(useLocale);
...
const colorName = computed(() => nameColor(color.value, browserLocale.value)?.name ?? "unknown");
```

Replace the first with:

```ts
import { Color } from "@urcolor/core";
```

Then remove the template markup that renders `colorName`, and any now-unused `browserLocale` computed. Read the file and make the removal coherent — the demo should still render its picker, just without a colour-name readout.

- [ ] **Step 3: Strip color naming from `FullPreview.vue`**

In `docs/components/vue/demo/FullPreview.vue`, delete:

```ts
import { useLocale, nameColor } from "internationalized-color";
import * as allLocales from "internationalized-color/locales";
...
Object.values(allLocales).forEach(useLocale);
...
  const result = nameColor(color.value, selectedLocale.value);
```

Remove the locale `<select>` and the name display from the template, plus the `selectedLocale` ref and any other state that only fed them.

- [ ] **Step 4: Rewrite the features copy**

`docs/guide/features.md` currently opens with:

> UrColor ships with full internationalization support for 74 languages powered by the [`internationalized-color`](https://github.com/GrandMagus02/internationalized-color) package.

Rewrite it around the surviving feature — the 74-language **channel labels** in `packages/core/src/i18n/`, exported as `translations` and `getChannelLabel`. State plainly that the labels ("Hue", "Saturation", …) are what is translated. Do not claim colour naming.

In `docs/.vitepress/components/FeaturesGrid.vue`, change:

```ts
      "Full internationalization powered by the internationalized-color package.",
```

to:

```ts
      "Channel labels translated across 74 languages, with zero runtime dependencies.",
```

In `docs/guide/index.md`, change:

```md
- `@urcolor/core` — Color conversion utilities (powered by [internationalized-color](https://github.com/GrandMagus02/internationalized-color)) and WebGL canvas gradient generators for color area sliders.
```

to:

```md
- `@urcolor/core` — A zero-dependency CSS Color 4 library (parse, convert, serialize, gamut-map, interpolate) plus WebGL canvas gradient generators for color area sliders.
```

- [ ] **Step 5: Clean the VitePress config**

In `docs/.vitepress/config.ts`, remove `"internationalized-color"` from the `resolve.dedupe` array (line ~58) and both `"internationalized-color"` and `"internationalized-color/css"` from `optimizeDeps.include` (line ~61).

- [ ] **Step 6: Update the guide prose code blocks**

The guide markdown files show `import { Color } from "internationalized-color";` inside fenced examples. Step 1's `sed` already rewrote them to `@urcolor/core`. Now fix the space-id literals in those same examples:

```bash
cd /Users/grandmagus/Documents/Projects/urcolor
grep -rn '"rgb"\|"p3"\|"a98"\|"prophoto"\|\.set({ mode\|\.toHex()' docs
```

Change each to the new API (`.with({ space: … })`, `.toString("hex")`) and CSS ids. Re-run until empty.

- [ ] **Step 7: Verify no reference survives**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor
grep -rn 'internationalized-color' docs || echo "CLEAN"
```

Expected: `CLEAN`.

- [ ] **Step 8: Build the docs**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun run docs:build
```

Expected: builds all three packages, VitePress, and Storybook with no errors. This is the broadest gate in the plan — it compiles every demo, story, and markdown code fence.

- [ ] **Step 9: Commit**

```bash
git add docs
git commit -m "docs: migrate to @urcolor/core and drop the color-naming feature

The naming feature (nameColor/useLocale across 74 locale dictionaries) came
from internationalized-color and is removed with it. The surviving i18n
feature — 74-language channel labels in packages/core/src/i18n — is what the
features page now describes.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: Drop the dependency and verify end to end

**Files:**
- Modify: `package.json` (root)
- Modify: `CLAUDE.md`
- Modify: `packages/core/CHANGELOG.md`, `packages/vue/CHANGELOG.md`, `packages/react/CHANGELOG.md`
- Modify: `README.md`, `packages/core/README.md`
- Modify: `bun.lock` (regenerated)

**Interfaces:**
- Consumes: everything.
- Produces: a repository with no reference to `internationalized-color` outside historical changelog entries.

- [ ] **Step 1: Remove the root dependency**

In the root `package.json`, delete the `internationalized-color` line from `dependencies`, leaving:

```json
  "dependencies": {
    "@vercel/analytics": "^1.6.1"
  }
```

- [ ] **Step 2: Regenerate the lockfile**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun install
grep -c 'internationalized-color' bun.lock || echo "0"
```

Expected: `0`. If the package still appears, some `package.json` still lists it — find it with `grep -rn internationalized-color packages/*/package.json docs/package.json package.json` and remove it, then re-run `bun install`.

- [ ] **Step 3: Update the documented demo conventions**

`CLAUDE.md` line ~33 documents the demo-component import order as:

```md
- Import order: Vue composables → `import "internationalized-color/css"` → Color model → `@urcolor/vue` components
```

Change it to:

```md
- Import order: Vue composables → `import { Color } from "@urcolor/core"` → `@urcolor/vue` components
```

Also update the neighbouring convention line that reads `shallowRef<Color>(Color.parse("hsl(210, 80%, 50%)")!)` if the surrounding text references the old package.

- [ ] **Step 4: Update the READMEs**

In `README.md`, the bullet:

```md
- **Any color space** — sRGB, HSL, HSB, LCH, OKLCH, and more via [`internationalized-color`](https://github.com/user/internationalized-color)
```

becomes:

```md
- **Any color space** — sRGB, HSL, HSV, HWB, Lab, LCH, Oklab, OKLCH, Display P3, A98, ProPhoto, Rec.2020, and XYZ, with zero runtime dependencies
```

Do the same in `packages/core/README.md`: describe core as a self-contained CSS Color 4 library plus WebGL gradient generators, with no dependency attribution.

- [ ] **Step 5: Write the changelog entries**

Add an `## Unreleased` section at the top of each of `packages/core/CHANGELOG.md`, `packages/vue/CHANGELOG.md`, and `packages/react/CHANGELOG.md`. For core:

```md
## Unreleased

### Added

- A vendored, zero-dependency CSS Color 4 library: `Color`, `parse`, `tryParse`,
  `serialize`, `convert`, `gamutMap`, `inGamut`, `interpolate`, `mix`, `deltaE`,
  `contrast`, the `manipulate` helpers, `NAMED_COLORS`, and the space registry.
- An `hsv` working space. It has no CSS notation, so it cannot be parsed or named as
  a serialisation format; an `hsv` color serialises down to `rgb()`.

### Changed

- **BREAKING:** The `internationalized-color` dependency is removed. `@urcolor/core`
  now has no runtime dependencies.
- **BREAKING:** Color spaces are identified by CSS Color 4 ids. `rgb` → `srgb`,
  `p3` → `display-p3`, `a98` → `a98-rgb`, `prophoto` → `prophoto-rgb`.
- **BREAKING:** `ColorSpaceConfig.mode` is renamed to `.space` and typed `SpaceId`.
- **BREAKING:** `displayToCulori` / `culoriToDisplay` are renamed to `displayToNative`
  / `nativeToDisplay`; `ChannelConfig.culoriMin` / `.culoriMax` become `.nativeMin` /
  `.nativeMax`.
- **BREAKING:** Gradient functions take `SpaceId` rather than `string`.

### Removed

- **BREAKING:** Color naming (`nameColor`, `useLocale`, `nearestColors`,
  `lookupColor`, `listColorNames`, `translateColor`) and its 74 locale dictionaries.
  The unrelated 74-language *channel label* translations (`translations`,
  `getChannelLabel`) are unaffected.
- The `internationalized-color/css` side-effect import is no longer needed or
  available — the vendored registry requires no bootstrapping.

### Migration

| old | new |
| --- | --- |
| `Color.parse(v)` → `Color \| undefined` | `Color.parse(v)` → `Color \| null` |
| `.set({ mode, ...channels })` | `.with({ space, ...channels })` |
| `.set({ alpha: n })` | `.withAlpha(n)` |
| `.to("rgb")` → nullable | `.to("srgb")` → non-null |
| `.toHex()` → nullable | `.toString("hex")` → `string` |
| `.mode` | `.space` |
| `import "internationalized-color/css"` | delete the line |
```

For `packages/vue` and `packages/react`, add a shorter entry noting that `Color` now comes from `@urcolor/core`, that `color-space` prop values use CSS ids, and pointing at the core changelog's migration table.

- [ ] **Step 6: Run every verification gate**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor
bun test
```

Expected: PASS across all packages.

```bash
bun run lint
```

Expected: eslint clean, `vue-tsc --noEmit` clean.

```bash
bun run docs:build
```

Expected: all three package builds, VitePress, and Storybook complete with no errors.

- [ ] **Step 7: Confirm the dependency is gone**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor
grep -rn 'internationalized-color' . \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git \
  --exclude-dir=storybook-static --exclude=bun.lock
```

Expected: hits only in `packages/*/CHANGELOG.md` (historical entries and the new migration notes) and `docs/superpowers/`. Nothing in `src`, nothing in a `package.json`, nothing in a live docs page.

- [ ] **Step 8: Confirm no culori-era space ids remain**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor
grep -rn '"rgb"\|"p3"\|"a98"\|"prophoto"\|culoriMin\|culoriMax\|displayToCulori\|culoriToDisplay' \
  packages/*/src docs --exclude-dir=node_modules --exclude-dir=dist \
  || echo "CLEAN"
```

Expected: `CLEAN`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore!: remove the internationalized-color dependency

BREAKING CHANGE: @urcolor/core now ships its own zero-dependency CSS Color 4
library. Color spaces use CSS Color 4 ids, Color's API changes shape, and the
color-naming feature is removed. See packages/core/CHANGELOG.md for the full
migration table.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Verification Summary

The work is complete when all of these hold:

1. `bun test` — green across `packages/core`, `packages/vue`, `packages/react`.
2. `bun run lint` — eslint and `vue-tsc --noEmit` both clean.
3. `bun run docs:build` — all three package builds, VitePress, and Storybook succeed.
4. `packages/core/package.json` has `"dependencies": {}`.
5. `grep -rn internationalized-color` (excluding `node_modules`, `dist`, `.git`, `bun.lock`) hits only changelog history and the spec/plan documents.
6. No `"rgb"`, `"p3"`, `"a98"`, `"prophoto"`, `culoriMin`, `culoriMax`, `displayToCulori`, or `culoriToDisplay` anywhere in `packages/*/src` or `docs`.

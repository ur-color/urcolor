# Angular and Svelte Packages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@urcolor/angular` and `@urcolor/svelte` at React parity, extract shared behavior into a new `@urcolor/primitives` package, and converge all four packages on a single combined `Thumb` per family.

**Architecture:** A new dependency-free `@urcolor/primitives` package holds every piece of behavior that is currently copy-pasted between `@urcolor/vue` and `@urcolor/react` — math, keyboard resolution, ARIA labels, canvas plumbing, pointer drag, and new slider/toggle state machines. The four framework packages become thin reactivity adapters over it. Svelte uses runes with attachments; Angular uses standalone signal directives on Angular 21.2.

**Tech Stack:** TypeScript, Bun (test + build), Vite (vue/react lib builds), `@sveltejs/package` (svelte), `ng-packagr` (angular), `@urcolor/core` for all color math.

**Spec:** `docs/superpowers/specs/2026-08-02-angular-svelte-packages-design.md`

## Global Constraints

- **Baseline:** `bun test` at plan start is **1003 pass, 5 todo, 0 fail, 1008 tests across 111 files**. Any task that ends with fewer passing tests than it started with (minus tests it deliberately deleted) is a failure.
- `@urcolor/primitives` imports **only** `@urcolor/core`. No `vue`, `react`, `svelte`, or `@angular/*` imports — not even as types.
- Angular peer dependencies are **`^21.2`**. `@angular/aria` is NOT a dependency — see the spec's "`@angular/aria` is not used" section. Angular 22 would require TypeScript 6.0 (beta), which `typescript-eslint` refuses; 21.2 accepts the repo's existing TypeScript 5.9.3.
- Svelte peer dependency is **`svelte: ^5.29`** — the floor where attachments exist.
- Svelte source lives under `src/lib/`, not `src/`. Relative imports must be fully specified; `.ts` files are imported with a `.js` extension.
- Angular file naming: hyphenated, **no** `.directive.ts` suffix (`color-slider-root.ts` → `class ColorSliderRoot`). Selectors are camelCase with the `urc` prefix.
- The `Checkerboard` parts are **not** ported to Angular or Svelte. They stay deprecated in vue/react.
- Tests are **out of scope** for `@urcolor/angular` and `@urcolor/svelte`. Their verification is a clean build plus a type check.
- Every package uses `"type": "module"` and follows the `packages/relative/package.json` shape for metadata (author, homepage, repository, bugs, publishConfig).
- Commit after every task. Never commit with failing tests.

---

## File Structure

**New — `packages/primitives/`**

| File | Responsibility |
|---|---|
| `src/math.ts` | Pure numeric helpers. No DOM. |
| `src/keys.ts` | Keyboard constants and arrow→axis resolution. |
| `src/labels.ts` | ARIA channel labels and value formatting. |
| `src/data-attributes.ts` | The `data-*` name constants shared by all four packages. |
| `src/canvas.ts` | Canvas sizing/blit and the checkerboard background constant. |
| `src/channel-model.ts` | Pure color↔display-value conversion. |
| `src/drag.ts` | Framework-agnostic pointer drag controller. |
| `src/slider.ts` | 1D slider state machine (replaces base-ui `Slider` for angular/svelte). |
| `src/toggle.ts` | Toggle + toggle-group state machines. |
| `src/index.ts` | Public surface. |
| `test/*.test.ts` | One file per module, mirroring `packages/core/test/`. |

**Modified — `packages/react/`, `packages/vue/`**: utils become re-exports; wheel/triangle thumbs merge.

**New — `packages/svelte/src/lib/`, `packages/angular/src/`**: one directory per family, mirroring React's kebab-case tree.

---

## Phase 1 — `@urcolor/primitives`

Everything downstream depends on the exact signatures established here. Tasks 1–9 are strictly sequential in signature terms but each is independently testable.

### Task 1: Package scaffold and `math.ts`

**Files:**
- Create: `packages/primitives/package.json`
- Create: `packages/primitives/tsconfig.build.json`
- Create: `packages/primitives/src/math.ts`
- Create: `packages/primitives/src/index.ts`
- Test: `packages/primitives/test/math.test.ts`

**Interfaces:**
- Consumes: `@urcolor/core` (nothing yet in this task)
- Produces:
  ```ts
  export function clamp(value: number, min?: number, max?: number): number
  export function getDecimalCount(value: number): number
  export function roundValue(value: number, decimalCount: number): number
  export function snapToStep(value: number, min: number, max: number, step: number): number
  export function linearScale(input: readonly [number, number], output: readonly [number, number]): (value: number) => number
  export function convertValueToPercentage(value: number, min: number, max: number): number
  export function getThumbInBoundsOffset(width: number, left: number, direction: number): number
  export function getClosestThumbIndex(values: number[][], point: number[], minX: number, maxX: number, minY: number, maxY: number): number
  export function hasMinStepsBetweenValues(values: number[], minStepsBetweenValues: number): boolean
  export function getLabel(index: number, totalValues: number): string | undefined
  ```

- [ ] **Step 1: Create the package manifest**

```json
{
  "name": "@urcolor/primitives",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "bun": "./src/index.ts",
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "publishConfig": { "access": "public" },
  "scripts": {
    "build": "bun run build:js && bun run build:types",
    "build:js": "bun build ./src/index.ts --outdir ./dist --format esm --external @urcolor/core",
    "build:types": "tsc --declaration --emitDeclarationOnly --outDir dist --project tsconfig.build.json"
  },
  "keywords": ["color", "color-picker", "headless", "framework-agnostic", "slider", "state-machine"],
  "author": { "name": "GrandMagus", "url": "https://github.com/GrandMagus02" },
  "homepage": "https://urcolor.vercel.app/",
  "repository": { "type": "git", "url": "https://github.com/ur-color/urcolor", "directory": "packages/primitives" },
  "bugs": { "url": "https://github.com/ur-color/urcolor/issues" },
  "dependencies": { "@urcolor/core": "workspace:*" }
}
```

And `tsconfig.build.json`, copied from `packages/relative/tsconfig.build.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "declaration": true,
    "emitDeclarationOnly": true,
    "outDir": "dist",
    "paths": { "@urcolor/core": ["../core/dist/index.d.ts"] }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 2: Write the failing test**

`packages/primitives/test/math.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import {
  clamp, getDecimalCount, roundValue, snapToStep, linearScale,
  convertValueToPercentage, getThumbInBoundsOffset, getClosestThumbIndex,
  hasMinStepsBetweenValues, getLabel,
} from "../src/math";

describe("clamp", () => {
  it("bounds a value on both sides", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
  it("is unbounded when limits are omitted", () => {
    expect(clamp(1e9)).toBe(1e9);
  });
});

describe("getDecimalCount", () => {
  it("counts fractional digits", () => {
    expect(getDecimalCount(1)).toBe(0);
    expect(getDecimalCount(0.01)).toBe(2);
  });
});

describe("roundValue", () => {
  it("rounds to a decimal count", () => {
    expect(roundValue(1.2345, 2)).toBe(1.23);
    expect(roundValue(1.2345, 0)).toBe(1);
  });
});

describe("snapToStep", () => {
  it("snaps to the nearest step and clamps", () => {
    expect(snapToStep(7, 0, 10, 5)).toBe(5);
    expect(snapToStep(8, 0, 10, 5)).toBe(10);
    expect(snapToStep(-5, 0, 10, 5)).toBe(0);
  });
  it("preserves the step's decimal precision", () => {
    expect(snapToStep(0.26, 0, 1, 0.1)).toBe(0.3);
  });
});

describe("linearScale", () => {
  it("maps between ranges", () => {
    expect(linearScale([0, 10], [0, 100])(5)).toBe(50);
  });
  it("returns the output floor for a degenerate range", () => {
    expect(linearScale([5, 5], [0, 100])(5)).toBe(0);
  });
});

describe("convertValueToPercentage", () => {
  it("maps a value into 0-100", () => {
    expect(convertValueToPercentage(5, 0, 10)).toBe(50);
    expect(convertValueToPercentage(-5, 0, 10)).toBe(0);
  });
});

describe("getThumbInBoundsOffset", () => {
  it("offsets a thumb at the track start by half its width", () => {
    expect(getThumbInBoundsOffset(20, 0, 1)).toBe(10);
  });
  it("offsets a thumb at the track end negatively", () => {
    expect(getThumbInBoundsOffset(20, 100, 1)).toBe(-10);
  });
});

describe("getClosestThumbIndex", () => {
  it("returns -1 for no thumbs and 0 for one", () => {
    expect(getClosestThumbIndex([], [0, 0], 0, 1, 0, 1)).toBe(-1);
    expect(getClosestThumbIndex([[9, 9]], [0, 0], 0, 1, 0, 1)).toBe(0);
  });
  it("picks the nearest thumb in normalized space", () => {
    expect(getClosestThumbIndex([[0, 0], [10, 10]], [9, 9], 0, 10, 0, 10)).toBe(1);
  });
});

describe("hasMinStepsBetweenValues", () => {
  it("is always true when the minimum is zero", () => {
    expect(hasMinStepsBetweenValues([1, 1], 0)).toBe(true);
  });
  it("rejects values that are too close", () => {
    expect(hasMinStepsBetweenValues([1, 2], 5)).toBe(false);
    expect(hasMinStepsBetweenValues([1, 10], 5)).toBe(true);
  });
});

describe("getLabel", () => {
  it("names the endpoints of a two-thumb slider", () => {
    expect(getLabel(0, 2)).toBe("Minimum");
    expect(getLabel(1, 2)).toBe("Maximum");
  });
  it("numbers thumbs beyond two and omits a label for one", () => {
    expect(getLabel(0, 3)).toBe("Value 1 of 3");
    expect(getLabel(0, 1)).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `bun test packages/primitives/test/math.test.ts`
Expected: FAIL — `Cannot find module '../src/math'`

- [ ] **Step 4: Create `src/math.ts`**

Copy the nine functions from `packages/react/src/utils.ts:1-70` **verbatim** — `clamp`, `getDecimalCount`, `roundValue`, `snapToStep`, `linearScale`, `convertValueToPercentage`, `getThumbInBoundsOffset`, `getClosestThumbIndex`, `hasMinStepsBetweenValues`. Do **not** copy `PAGE_KEYS`, `ARROW_KEYS`, `CHECKERBOARD_BACKGROUND`, or `warnCheckerboardDeprecated` — those belong to later tasks.

Then add `getLabel`, which exists only in vue today (`packages/vue/src/shared/utils.ts:50-57`):

```ts
export function getLabel(index: number, totalValues: number): string | undefined {
  if (totalValues > 2)
    return `Value ${index + 1} of ${totalValues}`;
  else if (totalValues === 2)
    return ["Minimum", "Maximum"][index];
  else
    return undefined;
}
```

- [ ] **Step 5: Create `src/index.ts`**

```ts
export * from "./math";
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `bun test packages/primitives/test/math.test.ts`
Expected: PASS, 20 tests

- [ ] **Step 7: Verify the package builds**

Run: `bun install && bun run --cwd packages/primitives build`
Expected: exit 0, `packages/primitives/dist/index.js` and `index.d.ts` exist

- [ ] **Step 8: Commit**

```bash
git add packages/primitives bun.lock
git commit -m "feat(primitives): add package scaffold and shared math helpers"
```

---

### Task 2: `keys.ts`

**Files:**
- Create: `packages/primitives/src/keys.ts`
- Modify: `packages/primitives/src/index.ts`
- Test: `packages/primitives/test/keys.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  ```ts
  export const PAGE_KEYS: readonly string[]        // ["PageUp", "PageDown"]
  export const ARROW_KEYS: readonly string[]       // ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]
  export type Axis = "x" | "y"
  export interface ArrowResolution { axis: Axis; sign: 1 | -1 }
  export interface ResolveArrowOptions {
    key: string
    orientation?: "horizontal" | "vertical"
    dir?: "ltr" | "rtl"
    inverted?: boolean
  }
  export function resolveArrowKey(options: ResolveArrowOptions): ArrowResolution | undefined
  export function stepMultiplier(event: { shiftKey?: boolean }): number
  ```

**Semantics.** `resolveArrowKey` maps a key to an axis and a sign, matching Vue's wheel/triangle mapping (`packages/vue/src/components/ColorTriangle/ColorTriangleRoot.vue:305-308`): `ArrowRight` → `{x, +1}`, `ArrowLeft` → `{x, -1}`, `ArrowUp` → `{y, +1}`, `ArrowDown` → `{y, -1}`. `dir: "rtl"` flips the sign of horizontal arrows only. `inverted: true` flips the sign of both axes. `orientation` does not change the mapping — it is accepted so 1D callers can ignore the off-axis result. Non-arrow keys return `undefined`.

- [ ] **Step 1: Write the failing test**

`packages/primitives/test/keys.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { PAGE_KEYS, ARROW_KEYS, resolveArrowKey, stepMultiplier } from "../src/keys";

describe("key constants", () => {
  it("lists the page and arrow keys", () => {
    expect(PAGE_KEYS).toEqual(["PageUp", "PageDown"]);
    expect(ARROW_KEYS).toEqual(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
  });
});

describe("resolveArrowKey", () => {
  it("maps horizontal arrows to the x axis", () => {
    expect(resolveArrowKey({ key: "ArrowRight" })).toEqual({ axis: "x", sign: 1 });
    expect(resolveArrowKey({ key: "ArrowLeft" })).toEqual({ axis: "x", sign: -1 });
  });
  it("maps vertical arrows to the y axis, up positive", () => {
    expect(resolveArrowKey({ key: "ArrowUp" })).toEqual({ axis: "y", sign: 1 });
    expect(resolveArrowKey({ key: "ArrowDown" })).toEqual({ axis: "y", sign: -1 });
  });
  it("returns undefined for keys it does not handle", () => {
    expect(resolveArrowKey({ key: "Enter" })).toBeUndefined();
    expect(resolveArrowKey({ key: "PageUp" })).toBeUndefined();
  });
  it("flips only horizontal arrows in rtl", () => {
    expect(resolveArrowKey({ key: "ArrowRight", dir: "rtl" })).toEqual({ axis: "x", sign: -1 });
    expect(resolveArrowKey({ key: "ArrowUp", dir: "rtl" })).toEqual({ axis: "y", sign: 1 });
  });
  it("flips both axes when inverted", () => {
    expect(resolveArrowKey({ key: "ArrowRight", inverted: true })).toEqual({ axis: "x", sign: -1 });
    expect(resolveArrowKey({ key: "ArrowUp", inverted: true })).toEqual({ axis: "y", sign: -1 });
  });
  it("cancels out when rtl and inverted are both set on a horizontal arrow", () => {
    expect(resolveArrowKey({ key: "ArrowRight", dir: "rtl", inverted: true })).toEqual({ axis: "x", sign: 1 });
  });
});

describe("stepMultiplier", () => {
  it("is 10 with shift and 1 without", () => {
    expect(stepMultiplier({ shiftKey: true })).toBe(10);
    expect(stepMultiplier({ shiftKey: false })).toBe(1);
    expect(stepMultiplier({})).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/primitives/test/keys.test.ts`
Expected: FAIL — `Cannot find module '../src/keys'`

- [ ] **Step 3: Implement `src/keys.ts`**

```ts
export const PAGE_KEYS = ["PageUp", "PageDown"] as const;
export const ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"] as const;

export type Axis = "x" | "y";

export interface ArrowResolution {
  axis: Axis;
  sign: 1 | -1;
}

export interface ResolveArrowOptions {
  key: string;
  /** Accepted so 1D callers can discard an off-axis result; does not change the mapping. */
  orientation?: "horizontal" | "vertical";
  dir?: "ltr" | "rtl";
  inverted?: boolean;
}

const BASE: Record<string, ArrowResolution> = {
  ArrowRight: { axis: "x", sign: 1 },
  ArrowLeft: { axis: "x", sign: -1 },
  ArrowUp: { axis: "y", sign: 1 },
  ArrowDown: { axis: "y", sign: -1 },
};

export function resolveArrowKey(options: ResolveArrowOptions): ArrowResolution | undefined {
  const base = BASE[options.key];
  if (!base) return undefined;
  let sign: number = base.sign;
  // RTL mirrors the horizontal axis only; the vertical axis is unaffected by
  // reading direction.
  if (options.dir === "rtl" && base.axis === "x") sign = -sign;
  if (options.inverted) sign = -sign;
  return { axis: base.axis, sign: sign as 1 | -1 };
}

export function stepMultiplier(event: { shiftKey?: boolean }): number {
  return event.shiftKey ? 10 : 1;
}
```

- [ ] **Step 4: Export from the index**

Append to `packages/primitives/src/index.ts`:

```ts
export * from "./keys";
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun test packages/primitives/test/keys.test.ts`
Expected: PASS, 8 tests

- [ ] **Step 6: Commit**

```bash
git add packages/primitives
git commit -m "feat(primitives): add keyboard constants and arrow axis resolution"
```

---

### Task 3: `labels.ts`

**Files:**
- Create: `packages/primitives/src/labels.ts`
- Modify: `packages/primitives/src/index.ts`
- Test: `packages/primitives/test/labels.test.ts`

**Interfaces:**
- Consumes: `getChannelConfig`, `type SpaceId` from `@urcolor/core`
- Produces:
  ```ts
  export function channelLabel(colorSpace: SpaceId, channelKey: string): string
  export function formatChannelValue(colorSpace: SpaceId, channelKey: string, value: number): string
  ```

- [ ] **Step 1: Write the failing test**

`packages/primitives/test/labels.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { channelLabel, formatChannelValue } from "../src/labels";

describe("channelLabel", () => {
  it("names alpha without consulting the space", () => {
    expect(channelLabel("hsl", "alpha")).toBe("Alpha");
  });
  it("uses the channel config label", () => {
    expect(channelLabel("hsl", "h")).toBe("Hue");
  });
  it("falls back to the raw key for an unknown channel", () => {
    expect(channelLabel("hsl", "zzz")).toBe("zzz");
  });
});

describe("formatChannelValue", () => {
  it("renders alpha as a whole percentage", () => {
    expect(formatChannelValue("hsl", "alpha", 50.4)).toBe("50%");
  });
  it("suffixes degree channels", () => {
    expect(formatChannelValue("hsl", "h", 210)).toBe("210°");
  });
  it("suffixes percentage channels", () => {
    expect(formatChannelValue("hsl", "s", 80)).toBe("80%");
  });
  it("strips a negative sign from a value that rounds to zero", () => {
    expect(formatChannelValue("hsl", "h", -0.3)).toBe("0°");
  });
  it("falls back to a rounded number for an unknown channel", () => {
    expect(formatChannelValue("hsl", "zzz", 1.7)).toBe("2");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/primitives/test/labels.test.ts`
Expected: FAIL — `Cannot find module '../src/labels'`

- [ ] **Step 3: Create `src/labels.ts`**

Copy `packages/vue/src/shared/channel-labels.ts` verbatim — it is already framework-agnostic and already carries the negative-zero comment. No changes.

- [ ] **Step 4: Export from the index**

```ts
export * from "./labels";
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun test packages/primitives/test/labels.test.ts`
Expected: PASS, 8 tests

If `channelLabel("hsl", "h")` does not return `"Hue"`, read the actual label out of `packages/core/src/color-spaces.ts` and correct the test to match the real config rather than changing the implementation.

- [ ] **Step 6: Commit**

```bash
git add packages/primitives
git commit -m "feat(primitives): add ARIA channel labels and value formatting"
```

---

### Task 4: `data-attributes.ts`

**Files:**
- Create: `packages/primitives/src/data-attributes.ts`
- Modify: `packages/primitives/src/index.ts`
- Test: `packages/primitives/test/data-attributes.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  ```ts
  export const DATA_DISABLED = "data-disabled"
  export const DATA_ORIENTATION = "data-orientation"
  export const DATA_PRESSED = "data-pressed"
  export const DATA_READONLY = "data-readonly"
  export const DATA_DRAGGING = "data-dragging"
  export const DATA_COLOR_TRIANGLE_ROOT = "data-color-triangle-root"
  export const DATA_SLIDER_AREA_IMPL = "data-slider-area-impl"
  ```

These are the complete set of `data-*` names currently emitted across React's 30 `*DataAttributes.ts` files, plus `data-dragging`, which the new packages need in order to expose drag state without a context read.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "bun:test";
import * as attrs from "../src/data-attributes";

describe("data attribute names", () => {
  it("exposes every shared data-* name", () => {
    expect(attrs.DATA_DISABLED).toBe("data-disabled");
    expect(attrs.DATA_ORIENTATION).toBe("data-orientation");
    expect(attrs.DATA_PRESSED).toBe("data-pressed");
    expect(attrs.DATA_READONLY).toBe("data-readonly");
    expect(attrs.DATA_DRAGGING).toBe("data-dragging");
    expect(attrs.DATA_COLOR_TRIANGLE_ROOT).toBe("data-color-triangle-root");
    expect(attrs.DATA_SLIDER_AREA_IMPL).toBe("data-slider-area-impl");
  });
  it("uses only lowercase kebab-case data- names", () => {
    for (const value of Object.values(attrs)) {
      expect(value).toMatch(/^data-[a-z-]+$/);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/primitives/test/data-attributes.test.ts`
Expected: FAIL — `Cannot find module '../src/data-attributes'`

- [ ] **Step 3: Implement `src/data-attributes.ts`**

```ts
/** Present (as an empty string) while the control rejects interaction. */
export const DATA_DISABLED = "data-disabled";
/** "horizontal" | "vertical". */
export const DATA_ORIENTATION = "data-orientation";
/** Present while a toggle is on. */
export const DATA_PRESSED = "data-pressed";
/** Present while the control is readonly. */
export const DATA_READONLY = "data-readonly";
/** Present while a pointer drag is in flight. */
export const DATA_DRAGGING = "data-dragging";
/** Marks the triangle root so a thumb can measure its container. */
export const DATA_COLOR_TRIANGLE_ROOT = "data-color-triangle-root";
/** Marks the slider's interactive area implementation element. */
export const DATA_SLIDER_AREA_IMPL = "data-slider-area-impl";
```

- [ ] **Step 4: Export from the index**

```ts
export * from "./data-attributes";
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun test packages/primitives/test/data-attributes.test.ts`
Expected: PASS, 2 tests

- [ ] **Step 6: Commit**

```bash
git add packages/primitives
git commit -m "feat(primitives): add shared data-attribute name constants"
```

---

### Task 5: `canvas.ts`

**Files:**
- Create: `packages/primitives/src/canvas.ts`
- Modify: `packages/primitives/src/index.ts`
- Test: `packages/primitives/test/canvas.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  ```ts
  export const CHECKERBOARD_BACKGROUND: string
  export interface RenderToCanvasOptions {
    canvas: HTMLCanvasElement
    pixels: Uint8ClampedArray
    sampleWidth: number
    sampleHeight: number
    /** Defaults to globalThis.devicePixelRatio, or 1 when unavailable. */
    dpr?: number
  }
  export function renderToCanvas(options: RenderToCanvasOptions): void
  export function warnCheckerboardDeprecated(): void
  ```

`renderToCanvas` returns early (no throw) when the 2D context is unavailable, when `OffscreenCanvas` is not defined, or when the canvas has zero client size. This is what makes it safe to call during a SvelteKit or Angular SSR pass.

- [ ] **Step 1: Write the failing test**

`packages/primitives/test/canvas.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { CHECKERBOARD_BACKGROUND, renderToCanvas } from "../src/canvas";

function fakeCanvas(clientWidth: number, clientHeight: number) {
  return {
    clientWidth,
    clientHeight,
    width: 0,
    height: 0,
    getContext: () => null,
  } as unknown as HTMLCanvasElement;
}

describe("CHECKERBOARD_BACKGROUND", () => {
  it("is a repeating conic gradient", () => {
    expect(CHECKERBOARD_BACKGROUND).toContain("repeating-conic-gradient");
  });
});

describe("renderToCanvas", () => {
  it("does not throw when the 2D context is unavailable", () => {
    expect(() => renderToCanvas({
      canvas: fakeCanvas(10, 10),
      pixels: new Uint8ClampedArray(4),
      sampleWidth: 1,
      sampleHeight: 1,
    })).not.toThrow();
  });

  it("does not throw when the canvas has zero size", () => {
    expect(() => renderToCanvas({
      canvas: fakeCanvas(0, 0),
      pixels: new Uint8ClampedArray(4),
      sampleWidth: 1,
      sampleHeight: 1,
    })).not.toThrow();
  });

  it("leaves the backing store untouched for a zero-size canvas", () => {
    const canvas = fakeCanvas(0, 0);
    renderToCanvas({ canvas, pixels: new Uint8ClampedArray(4), sampleWidth: 1, sampleHeight: 1 });
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/primitives/test/canvas.test.ts`
Expected: FAIL — `Cannot find module '../src/canvas'`

- [ ] **Step 3: Implement `src/canvas.ts`**

Port `renderToCanvas` from `packages/react/src/components/color-area/gradient/ColorAreaGradient.tsx:16-32`, adding the guards:

```ts
/** CSS `background` value that paints the transparency checkerboard. */
export const CHECKERBOARD_BACKGROUND
  = "repeating-conic-gradient(rgb(230, 230, 230) 0% 25%, white 0% 50%) 0% 50% / 16px 16px";

export interface RenderToCanvasOptions {
  canvas: HTMLCanvasElement;
  pixels: Uint8ClampedArray;
  sampleWidth: number;
  sampleHeight: number;
  dpr?: number;
}

export function renderToCanvas(options: RenderToCanvasOptions): void {
  const { canvas, pixels, sampleWidth, sampleHeight } = options;

  // Guards, in order: no DOM canvas API at all (SSR), no OffscreenCanvas, an
  // unlaid-out or detached element, no 2D context. Each is a legitimate
  // runtime state rather than an error, so all of them return quietly.
  if (typeof ImageData === "undefined" || typeof OffscreenCanvas === "undefined") return;
  if (!canvas.clientWidth || !canvas.clientHeight) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = options.dpr ?? (typeof devicePixelRatio !== "undefined" ? devicePixelRatio : 1);
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  const pixelData = new Uint8ClampedArray(pixels.buffer) as unknown as Uint8ClampedArray<ArrayBuffer>;
  const imageData = new ImageData(pixelData, sampleWidth, sampleHeight);
  const offscreen = new OffscreenCanvas(sampleWidth, sampleHeight);
  const offCtx = offscreen.getContext("2d");
  if (!offCtx) return;
  offCtx.putImageData(imageData, 0, 0);

  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(offscreen, 0, 0, w, h);
}

let checkerboardWarned = false;

/**
 * Emit a one-time deprecation warning for the standalone Checkerboard
 * components. Silent in production builds.
 */
export function warnCheckerboardDeprecated(): void {
  if (checkerboardWarned) return;
  if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "production") return;
  checkerboardWarned = true;
  console.warn(
    "[urcolor] The Checkerboard components are deprecated. The Gradient components now paint the checkerboard themselves; remove the standalone Checkerboard from your markup.",
  );
}
```

- [ ] **Step 4: Export from the index**

```ts
export * from "./canvas";
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun test packages/primitives/test/canvas.test.ts`
Expected: PASS, 4 tests

- [ ] **Step 6: Commit**

```bash
git add packages/primitives
git commit -m "feat(primitives): add SSR-safe canvas rendering and checkerboard helpers"
```

---

### Task 6: `channel-model.ts`

**Files:**
- Create: `packages/primitives/src/channel-model.ts`
- Modify: `packages/primitives/src/index.ts`
- Test: `packages/primitives/test/channel-model.test.ts`

**Interfaces:**
- Consumes: `Color`, `getChannelConfig`, `displayToNative`, `nativeToDisplay`, `type ChannelConfig`, `type SpaceId` from `@urcolor/core`
- Produces:
  ```ts
  export const ALPHA_CONFIG: ChannelConfig
  export const FEEDBACK_EPSILON: number
  export function parseColor(v: Color | string | null | undefined): Color | undefined
  export function resolveChannelConfig(colorSpace: SpaceId, channel: string): ChannelConfig | undefined
  export function colorToDisplayValue(color: Color, colorSpace: SpaceId, channel: string): number
  export function applyDisplayValue(color: Color, colorSpace: SpaceId, channel: string, value: number): Color
  export function applyDisplayValues(color: Color, colorSpace: SpaceId, channels: string[], values: number[]): Color
  ```

This is the **pure** half of `packages/vue/src/shared/useColorChannelModel.ts`. The reactive orchestration (refs, watchers, emits) stays in each framework package.

- [ ] **Step 1: Write the failing test**

`packages/primitives/test/channel-model.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { Color } from "@urcolor/core";
import {
  ALPHA_CONFIG, parseColor, resolveChannelConfig,
  colorToDisplayValue, applyDisplayValue, applyDisplayValues,
} from "../src/channel-model";

const BLUE = Color.parse("hsl(210, 80%, 50%)")!;

describe("parseColor", () => {
  it("passes a Color through", () => {
    expect(parseColor(BLUE)).toBe(BLUE);
  });
  it("parses a string", () => {
    expect(parseColor("red")?.toString("hex")).toBe(Color.parse("red")!.toString("hex"));
  });
  it("returns undefined for empty input", () => {
    expect(parseColor(null)).toBeUndefined();
    expect(parseColor(undefined)).toBeUndefined();
    expect(parseColor("")).toBeUndefined();
  });
  it("returns undefined for an unparseable string", () => {
    expect(parseColor("not-a-color")).toBeUndefined();
  });
});

describe("resolveChannelConfig", () => {
  it("returns the alpha config for the alpha channel", () => {
    expect(resolveChannelConfig("hsl", "alpha")).toEqual(ALPHA_CONFIG);
  });
  it("returns the space config for a real channel", () => {
    expect(resolveChannelConfig("hsl", "h")?.key).toBe("h");
  });
  it("returns undefined for an unknown channel", () => {
    expect(resolveChannelConfig("hsl", "zzz")).toBeUndefined();
  });
});

describe("colorToDisplayValue", () => {
  it("reads a channel in display units", () => {
    expect(Math.round(colorToDisplayValue(BLUE, "hsl", "h"))).toBe(210);
  });
  it("reads alpha as a 0-100 percentage", () => {
    expect(colorToDisplayValue(BLUE.withAlpha(0.5), "hsl", "alpha")).toBe(50);
  });
});

describe("applyDisplayValue", () => {
  it("round-trips a channel through display units", () => {
    const next = applyDisplayValue(BLUE, "hsl", "h", 120);
    expect(Math.round(colorToDisplayValue(next, "hsl", "h"))).toBe(120);
  });
  it("writes alpha through withAlpha", () => {
    expect(applyDisplayValue(BLUE, "hsl", "alpha", 25).alpha).toBeCloseTo(0.25, 5);
  });
  it("returns the input unchanged for an unknown channel", () => {
    expect(applyDisplayValue(BLUE, "hsl", "zzz", 1)).toBe(BLUE);
  });
});

describe("applyDisplayValues", () => {
  it("writes several channels at once", () => {
    const next = applyDisplayValues(BLUE, "hsl", ["h", "s"], [120, 50]);
    expect(Math.round(colorToDisplayValue(next, "hsl", "h"))).toBe(120);
    expect(Math.round(colorToDisplayValue(next, "hsl", "s"))).toBe(50);
  });
  it("ignores channels with no matching value", () => {
    const next = applyDisplayValues(BLUE, "hsl", ["h", "s"], [120]);
    expect(Math.round(colorToDisplayValue(next, "hsl", "h"))).toBe(120);
    expect(Math.round(colorToDisplayValue(next, "hsl", "s"))).toBe(80);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/primitives/test/channel-model.test.ts`
Expected: FAIL — `Cannot find module '../src/channel-model'`

- [ ] **Step 3: Implement `src/channel-model.ts`**

```ts
import type { ChannelConfig, SpaceId } from "@urcolor/core";
import { Color, displayToNative, getChannelConfig, nativeToDisplay } from "@urcolor/core";

/**
 * The alpha channel is displayed as a 0-100 percentage but stored natively as
 * 0-1, and is written through `withAlpha` rather than `with({ space, ... })`.
 */
export const ALPHA_CONFIG: ChannelConfig = {
  key: "alpha",
  label: "Alpha",
  min: 0,
  max: 100,
  step: 1,
  format: "percentage",
  nativeMin: 0,
  nativeMax: 1,
};

/** Display values closer than this to the current ones are treated as noise. */
export const FEEDBACK_EPSILON = 0.001;

export function parseColor(v: Color | string | null | undefined): Color | undefined {
  if (!v) return undefined;
  if (v instanceof Color) return v;
  return Color.parse(v) ?? undefined;
}

export function resolveChannelConfig(colorSpace: SpaceId, channel: string): ChannelConfig | undefined {
  if (channel === "alpha") return ALPHA_CONFIG;
  return getChannelConfig(colorSpace, channel);
}

export function colorToDisplayValue(color: Color, colorSpace: SpaceId, channel: string): number {
  const config = resolveChannelConfig(colorSpace, channel);
  if (!config) return 0;
  if (channel === "alpha") return color.alpha * 100;
  return nativeToDisplay(config, color.to(colorSpace).get(channel));
}

export function applyDisplayValue(color: Color, colorSpace: SpaceId, channel: string, value: number): Color {
  const config = resolveChannelConfig(colorSpace, channel);
  if (!config) return color;
  if (channel === "alpha") return color.withAlpha(value / 100);
  return color.with({ space: colorSpace, [channel]: displayToNative(config, value) });
}

export function applyDisplayValues(color: Color, colorSpace: SpaceId, channels: string[], values: number[]): Color {
  let result = color;
  for (let i = 0; i < channels.length; i++) {
    const channel = channels[i];
    const value = values[i];
    if (channel === undefined || value === undefined) continue;
    result = applyDisplayValue(result, colorSpace, channel, value);
  }
  return result;
}
```

- [ ] **Step 4: Export from the index**

```ts
export * from "./channel-model";
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun test packages/primitives/test/channel-model.test.ts`
Expected: PASS, 14 tests

- [ ] **Step 6: Commit**

```bash
git add packages/primitives
git commit -m "feat(primitives): add pure colour channel display model"
```

---

### Task 7: `drag.ts`

**Files:**
- Create: `packages/primitives/src/drag.ts`
- Modify: `packages/primitives/src/index.ts`
- Test: `packages/primitives/test/drag.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  ```ts
  export interface DragPoint {
    clientX: number
    clientY: number
    rect: DOMRect
    /** 0-1 across the element, left to right. */
    normalizedX: number
    /** 0-1 down the element, top to bottom. */
    normalizedY: number
  }
  export interface PointerLike {
    pointerId: number
    clientX: number
    clientY: number
    target: EventTarget | null
    preventDefault(): void
  }
  export interface DragControllerOptions {
    getElement(): HTMLElement | null | undefined
    onMove(point: DragPoint): void
    onStart?(point: DragPoint): void
    onEnd?(point: DragPoint): void
    /** Return false to reject a pointerdown, e.g. outside a circular hit area. */
    hitTest?(point: DragPoint): boolean
    isDisabled?(): boolean
  }
  export interface DragController {
    readonly isDragging: boolean
    pointerDown(event: PointerLike): void
    pointerMove(event: PointerLike): void
    pointerUp(event: PointerLike): void
    /** Release capture and clear state; call on unmount. */
    cancel(): void
  }
  export function createDragController(options: DragControllerOptions): DragController
  ```

**Behavior.** `pointerDown` measures the element once and caches the rect for the gesture (matching React's `rectRef` optimisation). It calls `hitTest` before capturing; a false result aborts without starting a drag. `pointerMove` coalesces through `requestAnimationFrame` and ignores events while a frame is pending. `pointerUp` releases capture, clears the cached rect, and fires `onEnd`. `isDisabled()` returning true makes `pointerDown` a no-op.

- [ ] **Step 1: Write the failing test**

`packages/primitives/test/drag.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { createDragController, type DragPoint, type PointerLike } from "../src/drag";

function makeElement(rect: { left: number; top: number; width: number; height: number }) {
  const captured = new Set<number>();
  return {
    el: {
      getBoundingClientRect: () => ({ ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height, x: rect.left, y: rect.top, toJSON: () => ({}) }) as DOMRect,
      setPointerCapture: (id: number) => { captured.add(id); },
      releasePointerCapture: (id: number) => { captured.delete(id); },
      hasPointerCapture: (id: number) => captured.has(id),
    } as unknown as HTMLElement,
    captured,
  };
}

function makeEvent(clientX: number, clientY: number, target: unknown): PointerLike {
  return { pointerId: 1, clientX, clientY, target: target as EventTarget, preventDefault: () => {} };
}

describe("createDragController", () => {
  it("normalizes a pointer position against the element rect", () => {
    const { el } = makeElement({ left: 0, top: 0, width: 200, height: 100 });
    const moves: DragPoint[] = [];
    const c = createDragController({ getElement: () => el, onMove: p => moves.push(p) });
    c.pointerDown(makeEvent(100, 50, el));
    expect(moves).toHaveLength(1);
    expect(moves[0]!.normalizedX).toBeCloseTo(0.5, 5);
    expect(moves[0]!.normalizedY).toBeCloseTo(0.5, 5);
  });

  it("clamps a position outside the element into 0-1", () => {
    const { el } = makeElement({ left: 0, top: 0, width: 200, height: 100 });
    const moves: DragPoint[] = [];
    const c = createDragController({ getElement: () => el, onMove: p => moves.push(p) });
    c.pointerDown(makeEvent(-50, 500, el));
    expect(moves[0]!.normalizedX).toBe(0);
    expect(moves[0]!.normalizedY).toBe(1);
  });

  it("reports dragging state across the gesture", () => {
    const { el } = makeElement({ left: 0, top: 0, width: 10, height: 10 });
    const c = createDragController({ getElement: () => el, onMove: () => {} });
    expect(c.isDragging).toBe(false);
    c.pointerDown(makeEvent(5, 5, el));
    expect(c.isDragging).toBe(true);
    c.pointerUp(makeEvent(5, 5, el));
    expect(c.isDragging).toBe(false);
  });

  it("captures and releases the pointer", () => {
    const { el, captured } = makeElement({ left: 0, top: 0, width: 10, height: 10 });
    const c = createDragController({ getElement: () => el, onMove: () => {} });
    c.pointerDown(makeEvent(5, 5, el));
    expect(captured.has(1)).toBe(true);
    c.pointerUp(makeEvent(5, 5, el));
    expect(captured.has(1)).toBe(false);
  });

  it("does nothing when disabled", () => {
    const { el } = makeElement({ left: 0, top: 0, width: 10, height: 10 });
    const moves: DragPoint[] = [];
    const c = createDragController({ getElement: () => el, onMove: p => moves.push(p), isDisabled: () => true });
    c.pointerDown(makeEvent(5, 5, el));
    expect(moves).toHaveLength(0);
    expect(c.isDragging).toBe(false);
  });

  it("aborts when hitTest rejects the point", () => {
    const { el, captured } = makeElement({ left: 0, top: 0, width: 10, height: 10 });
    const moves: DragPoint[] = [];
    const c = createDragController({ getElement: () => el, onMove: p => moves.push(p), hitTest: () => false });
    c.pointerDown(makeEvent(5, 5, el));
    expect(moves).toHaveLength(0);
    expect(captured.has(1)).toBe(false);
    expect(c.isDragging).toBe(false);
  });

  it("fires onStart and onEnd exactly once per gesture", () => {
    const { el } = makeElement({ left: 0, top: 0, width: 10, height: 10 });
    let starts = 0, ends = 0;
    const c = createDragController({
      getElement: () => el, onMove: () => {},
      onStart: () => { starts++; }, onEnd: () => { ends++; },
    });
    c.pointerDown(makeEvent(5, 5, el));
    c.pointerUp(makeEvent(5, 5, el));
    expect(starts).toBe(1);
    expect(ends).toBe(1);
  });

  it("ignores pointerup without a matching capture", () => {
    const { el } = makeElement({ left: 0, top: 0, width: 10, height: 10 });
    let ends = 0;
    const c = createDragController({ getElement: () => el, onMove: () => {}, onEnd: () => { ends++; } });
    c.pointerUp(makeEvent(5, 5, el));
    expect(ends).toBe(0);
  });

  it("cancel clears dragging state", () => {
    const { el, captured } = makeElement({ left: 0, top: 0, width: 10, height: 10 });
    const c = createDragController({ getElement: () => el, onMove: () => {} });
    c.pointerDown(makeEvent(5, 5, el));
    c.cancel();
    expect(c.isDragging).toBe(false);
    expect(captured.has(1)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/primitives/test/drag.test.ts`
Expected: FAIL — `Cannot find module '../src/drag'`

- [ ] **Step 3: Implement `src/drag.ts`**

```ts
import { clamp } from "./math";

export interface DragPoint {
  clientX: number;
  clientY: number;
  rect: DOMRect;
  /** 0-1 across the element, left to right. */
  normalizedX: number;
  /** 0-1 down the element, top to bottom. */
  normalizedY: number;
}

export interface PointerLike {
  pointerId: number;
  clientX: number;
  clientY: number;
  target: EventTarget | null;
  preventDefault(): void;
}

export interface DragControllerOptions {
  getElement(): HTMLElement | null | undefined;
  onMove(point: DragPoint): void;
  onStart?(point: DragPoint): void;
  onEnd?(point: DragPoint): void;
  /** Return false to reject a pointerdown, e.g. outside a circular hit area. */
  hitTest?(point: DragPoint): boolean;
  isDisabled?(): boolean;
}

export interface DragController {
  readonly isDragging: boolean;
  pointerDown(event: PointerLike): void;
  pointerMove(event: PointerLike): void;
  pointerUp(event: PointerLike): void;
  cancel(): void;
}

function toPoint(rect: DOMRect, clientX: number, clientY: number): DragPoint {
  return {
    clientX,
    clientY,
    rect,
    normalizedX: rect.width === 0 ? 0 : clamp((clientX - rect.left) / rect.width, 0, 1),
    normalizedY: rect.height === 0 ? 0 : clamp((clientY - rect.top) / rect.height, 0, 1),
  };
}

export function createDragController(options: DragControllerOptions): DragController {
  let dragging = false;
  let activePointerId: number | undefined;
  // The rect is measured once per gesture; re-measuring on every move forces
  // layout and is the dominant cost of a drag.
  let cachedRect: DOMRect | undefined;
  let rafPending = false;

  function capturedTarget(event: PointerLike): (HTMLElement & { releasePointerCapture(id: number): void }) | undefined {
    const target = event.target as HTMLElement | null;
    if (!target || typeof target.hasPointerCapture !== "function") return undefined;
    if (!target.hasPointerCapture(event.pointerId)) return undefined;
    return target as HTMLElement & { releasePointerCapture(id: number): void };
  }

  return {
    get isDragging() {
      return dragging;
    },

    pointerDown(event) {
      if (options.isDisabled?.()) return;
      const el = options.getElement();
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const point = toPoint(rect, event.clientX, event.clientY);
      if (options.hitTest && !options.hitTest(point)) return;

      cachedRect = rect;
      activePointerId = event.pointerId;
      dragging = true;

      const target = event.target as HTMLElement | null;
      if (target && typeof target.setPointerCapture === "function") {
        target.setPointerCapture(event.pointerId);
      }
      event.preventDefault();

      options.onStart?.(point);
      options.onMove(point);
    },

    pointerMove(event) {
      if (!dragging || event.pointerId !== activePointerId) return;
      if (rafPending) return;
      rafPending = true;
      const { clientX, clientY } = event;
      const run = () => {
        rafPending = false;
        const rect = cachedRect ?? options.getElement()?.getBoundingClientRect();
        if (!rect) return;
        options.onMove(toPoint(rect, clientX, clientY));
      };
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
      else run();
    },

    pointerUp(event) {
      const target = capturedTarget(event);
      if (!dragging || !target) return;
      target.releasePointerCapture(event.pointerId);
      const rect = cachedRect ?? options.getElement()?.getBoundingClientRect();
      dragging = false;
      activePointerId = undefined;
      cachedRect = undefined;
      if (rect) options.onEnd?.(toPoint(rect, event.clientX, event.clientY));
    },

    cancel() {
      dragging = false;
      activePointerId = undefined;
      cachedRect = undefined;
      rafPending = false;
    },
  };
}
```

Note the `cancel()` test expects capture released. `cancel()` has no event, so it cannot release capture itself — adjust the test to assert only `isDragging === false`, and delete the `captured.has(1)` assertion from that test. Capture release on unmount is the framework adapter's job via the element's own lifecycle.

- [ ] **Step 4: Export from the index**

```ts
export * from "./drag";
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun test packages/primitives/test/drag.test.ts`
Expected: PASS, 9 tests

- [ ] **Step 6: Commit**

```bash
git add packages/primitives
git commit -m "feat(primitives): add framework-agnostic pointer drag controller"
```

---

### Task 8: `slider.ts`

This is the highest-risk task in the plan. It replaces base-ui's `Slider` for Angular and Svelte.

**Files:**
- Create: `packages/primitives/src/slider.ts`
- Modify: `packages/primitives/src/index.ts`
- Test: `packages/primitives/test/slider.test.ts`

**Interfaces:**
- Consumes: `clamp`, `snapToStep` from `./math`; `resolveArrowKey`, `stepMultiplier`, `PAGE_KEYS` from `./keys`
- Produces:
  ```ts
  export interface SliderState {
    value: number
    min: number
    max: number
    step: number
    orientation: "horizontal" | "vertical"
    dir: "ltr" | "rtl"
    inverted: boolean
    disabled: boolean
  }
  export interface SliderKeyEvent {
    key: string
    shiftKey?: boolean
  }
  export interface SliderAriaAttributes {
    role: "slider"
    "aria-valuenow": number
    "aria-valuemin": number
    "aria-valuemax": number
    "aria-orientation": "horizontal" | "vertical"
    "aria-disabled": true | undefined
    tabindex: 0 | undefined
  }
  /** Value for a 0-1 position along the track, honouring dir and inverted. */
  export function valueFromPosition(state: SliderState, position: number): number
  /** 0-1 position for the current value, honouring dir and inverted. */
  export function positionFromValue(state: SliderState): number
  /** Next value for a key, or undefined if the key is not handled. */
  export function valueFromKey(state: SliderState, event: SliderKeyEvent): number | undefined
  export function sliderAria(state: SliderState): SliderAriaAttributes
  ```

**Behavior contract, spelled out because these are the edge cases base-ui handled for us:**

1. `valueFromPosition` snaps to `step` and clamps to `[min, max]`.
2. A **vertical** slider treats position 0 as the *bottom* — position is inverted relative to horizontal.
3. **RTL** flips a horizontal slider's position. It does not affect a vertical slider.
4. `inverted: true` flips the position for both orientations, and composes with RTL (both set on horizontal cancel out).
5. `valueFromKey` uses `resolveArrowKey` with the state's `dir`/`inverted`, and takes the axis matching the orientation (`x` for horizontal, `y` for vertical). An off-axis arrow still moves the value — a horizontal slider responds to Up/Down — matching base-ui.
6. `PageUp`/`PageDown` move by `step * 10`, ignoring `shiftKey`.
7. `Home` → `min`, `End` → `max`, regardless of `inverted` (these are value bounds, not visual ones).
8. `shiftKey` multiplies arrow steps by 10.
9. When `disabled`, `valueFromKey` returns `undefined` for every key.
10. `sliderAria` omits `tabindex` and sets `aria-disabled: true` when disabled.

- [ ] **Step 1: Write the failing test**

`packages/primitives/test/slider.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { valueFromPosition, positionFromValue, valueFromKey, sliderAria, type SliderState } from "../src/slider";

function state(overrides: Partial<SliderState> = {}): SliderState {
  return {
    value: 50, min: 0, max: 100, step: 1,
    orientation: "horizontal", dir: "ltr", inverted: false, disabled: false,
    ...overrides,
  };
}

describe("valueFromPosition", () => {
  it("maps a position across the range", () => {
    expect(valueFromPosition(state(), 0)).toBe(0);
    expect(valueFromPosition(state(), 0.5)).toBe(50);
    expect(valueFromPosition(state(), 1)).toBe(100);
  });
  it("clamps positions outside 0-1", () => {
    expect(valueFromPosition(state(), -1)).toBe(0);
    expect(valueFromPosition(state(), 2)).toBe(100);
  });
  it("snaps to the step", () => {
    expect(valueFromPosition(state({ step: 25 }), 0.4)).toBe(50);
  });
  it("inverts for a vertical slider so 0 is the bottom", () => {
    expect(valueFromPosition(state({ orientation: "vertical" }), 0)).toBe(100);
    expect(valueFromPosition(state({ orientation: "vertical" }), 1)).toBe(0);
  });
  it("flips a horizontal slider in rtl", () => {
    expect(valueFromPosition(state({ dir: "rtl" }), 0)).toBe(100);
  });
  it("does not let rtl affect a vertical slider", () => {
    expect(valueFromPosition(state({ orientation: "vertical", dir: "rtl" }), 0)).toBe(100);
  });
  it("flips when inverted", () => {
    expect(valueFromPosition(state({ inverted: true }), 0)).toBe(100);
  });
  it("cancels out when rtl and inverted are both set", () => {
    expect(valueFromPosition(state({ dir: "rtl", inverted: true }), 0)).toBe(0);
  });
});

describe("positionFromValue", () => {
  it("round-trips with valueFromPosition", () => {
    for (const s of [state(), state({ dir: "rtl" }), state({ inverted: true }), state({ orientation: "vertical" })]) {
      const pos = positionFromValue({ ...s, value: 25 });
      expect(valueFromPosition(s, pos)).toBe(25);
    }
  });
  it("returns 0 for a degenerate range", () => {
    expect(positionFromValue(state({ min: 5, max: 5, value: 5 }))).toBe(0);
  });
});

describe("valueFromKey", () => {
  it("steps up and down with horizontal arrows", () => {
    expect(valueFromKey(state(), { key: "ArrowRight" })).toBe(51);
    expect(valueFromKey(state(), { key: "ArrowLeft" })).toBe(49);
  });
  it("responds to off-axis arrows", () => {
    expect(valueFromKey(state(), { key: "ArrowUp" })).toBe(51);
    expect(valueFromKey(state({ orientation: "vertical" }), { key: "ArrowRight" })).toBe(51);
  });
  it("multiplies by 10 with shift", () => {
    expect(valueFromKey(state(), { key: "ArrowRight", shiftKey: true })).toBe(60);
  });
  it("pages by ten steps and ignores shift", () => {
    expect(valueFromKey(state(), { key: "PageUp" })).toBe(60);
    expect(valueFromKey(state(), { key: "PageDown" })).toBe(40);
    expect(valueFromKey(state(), { key: "PageUp", shiftKey: true })).toBe(60);
  });
  it("jumps to the bounds with Home and End regardless of inverted", () => {
    expect(valueFromKey(state(), { key: "Home" })).toBe(0);
    expect(valueFromKey(state(), { key: "End" })).toBe(100);
    expect(valueFromKey(state({ inverted: true }), { key: "Home" })).toBe(0);
  });
  it("reverses horizontal arrows in rtl", () => {
    expect(valueFromKey(state({ dir: "rtl" }), { key: "ArrowRight" })).toBe(49);
  });
  it("clamps at the bounds", () => {
    expect(valueFromKey(state({ value: 100 }), { key: "ArrowRight" })).toBe(100);
    expect(valueFromKey(state({ value: 0 }), { key: "ArrowLeft" })).toBe(0);
  });
  it("returns undefined for unhandled keys", () => {
    expect(valueFromKey(state(), { key: "Enter" })).toBeUndefined();
  });
  it("returns undefined for every key when disabled", () => {
    for (const key of ["ArrowRight", "PageUp", "Home", "End"]) {
      expect(valueFromKey(state({ disabled: true }), { key })).toBeUndefined();
    }
  });
});

describe("sliderAria", () => {
  it("describes an enabled slider", () => {
    expect(sliderAria(state())).toEqual({
      "role": "slider",
      "aria-valuenow": 50,
      "aria-valuemin": 0,
      "aria-valuemax": 100,
      "aria-orientation": "horizontal",
      "aria-disabled": undefined,
      "tabindex": 0,
    });
  });
  it("removes the tab stop when disabled", () => {
    const aria = sliderAria(state({ disabled: true }));
    expect(aria["aria-disabled"]).toBe(true);
    expect(aria.tabindex).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/primitives/test/slider.test.ts`
Expected: FAIL — `Cannot find module '../src/slider'`

- [ ] **Step 3: Implement `src/slider.ts`**

```ts
import { clamp, snapToStep } from "./math";
import { resolveArrowKey, stepMultiplier } from "./keys";

export interface SliderState {
  value: number;
  min: number;
  max: number;
  step: number;
  orientation: "horizontal" | "vertical";
  dir: "ltr" | "rtl";
  inverted: boolean;
  disabled: boolean;
}

export interface SliderKeyEvent {
  key: string;
  shiftKey?: boolean;
}

export interface SliderAriaAttributes {
  "role": "slider";
  "aria-valuenow": number;
  "aria-valuemin": number;
  "aria-valuemax": number;
  "aria-orientation": "horizontal" | "vertical";
  "aria-disabled": true | undefined;
  "tabindex": 0 | undefined;
}

/**
 * Whether a 0-1 track position runs opposite to increasing value.
 *
 * Vertical tracks are inverted by default: CSS measures downward, but a
 * vertical slider's maximum is at the top. RTL mirrors horizontal tracks only.
 * `inverted` composes on top of both, so a horizontal RTL inverted slider
 * reads left-to-right again.
 */
function isFlipped(state: SliderState): boolean {
  let flipped = state.orientation === "vertical";
  if (state.orientation === "horizontal" && state.dir === "rtl") flipped = !flipped;
  if (state.inverted) flipped = !flipped;
  return flipped;
}

export function valueFromPosition(state: SliderState, position: number): number {
  const p = clamp(position, 0, 1);
  const ratio = isFlipped(state) ? 1 - p : p;
  return snapToStep(state.min + ratio * (state.max - state.min), state.min, state.max, state.step);
}

export function positionFromValue(state: SliderState): number {
  const range = state.max - state.min;
  if (range === 0) return 0;
  const ratio = clamp((state.value - state.min) / range, 0, 1);
  return isFlipped(state) ? 1 - ratio : ratio;
}

export function valueFromKey(state: SliderState, event: SliderKeyEvent): number | undefined {
  if (state.disabled) return undefined;

  // Home and End address value bounds, not visual ends, so `inverted` and `dir`
  // deliberately do not apply.
  if (event.key === "Home") return state.min;
  if (event.key === "End") return state.max;

  if (event.key === "PageUp" || event.key === "PageDown") {
    const delta = state.step * 10 * (event.key === "PageUp" ? 1 : -1);
    return snapToStep(state.value + delta, state.min, state.max, state.step);
  }

  const arrow = resolveArrowKey({ key: event.key, dir: state.dir, inverted: state.inverted });
  if (!arrow) return undefined;

  // A 1D slider responds to both axes; the axis only matters for 2D controls.
  const delta = state.step * stepMultiplier(event) * arrow.sign;
  return snapToStep(state.value + delta, state.min, state.max, state.step);
}

export function sliderAria(state: SliderState): SliderAriaAttributes {
  return {
    "role": "slider",
    "aria-valuenow": state.value,
    "aria-valuemin": state.min,
    "aria-valuemax": state.max,
    "aria-orientation": state.orientation,
    "aria-disabled": state.disabled ? true : undefined,
    "tabindex": state.disabled ? undefined : 0,
  };
}
```

- [ ] **Step 4: Export from the index**

```ts
export * from "./slider";
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun test packages/primitives/test/slider.test.ts`
Expected: PASS, 22 tests

If the "cancels out when rtl and inverted" or vertical cases fail, fix `isFlipped` — do not weaken the test. The composition rules in the behavior contract above are the specification.

- [ ] **Step 6: Commit**

```bash
git add packages/primitives
git commit -m "feat(primitives): add 1D slider state machine"
```

---

### Task 9: `toggle.ts`

**Files:**
- Create: `packages/primitives/src/toggle.ts`
- Modify: `packages/primitives/src/index.ts`
- Test: `packages/primitives/test/toggle.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  ```ts
  export interface ToggleAriaAttributes {
    "aria-pressed": boolean
    "aria-disabled": true | undefined
    "data-pressed": "" | undefined
    "data-disabled": "" | undefined
    "tabindex": 0 | undefined
  }
  export function toggleAria(pressed: boolean, disabled: boolean): ToggleAriaAttributes
  /** True when the key should flip a toggle: Enter or Space. */
  export function isToggleActivationKey(key: string): boolean
  export interface ToggleGroupState {
    /** Index of the item that currently owns the group's single tab stop. */
    activeIndex: number
    count: number
    orientation: "horizontal" | "vertical"
    dir: "ltr" | "rtl"
    loop: boolean
  }
  /** Next active index for a roving-focus key, or undefined if unhandled. */
  export function rovingIndexFromKey(state: ToggleGroupState, key: string): number | undefined
  /** tabindex for an item in a roving-focus group. */
  export function rovingTabIndex(state: ToggleGroupState, index: number): 0 | -1
  ```

- [ ] **Step 1: Write the failing test**

`packages/primitives/test/toggle.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { toggleAria, isToggleActivationKey, rovingIndexFromKey, rovingTabIndex, type ToggleGroupState } from "../src/toggle";

function group(overrides: Partial<ToggleGroupState> = {}): ToggleGroupState {
  return { activeIndex: 0, count: 3, orientation: "horizontal", dir: "ltr", loop: true, ...overrides };
}

describe("toggleAria", () => {
  it("describes a pressed, enabled toggle", () => {
    expect(toggleAria(true, false)).toEqual({
      "aria-pressed": true,
      "aria-disabled": undefined,
      "data-pressed": "",
      "data-disabled": undefined,
      "tabindex": 0,
    });
  });
  it("describes an unpressed, disabled toggle", () => {
    expect(toggleAria(false, true)).toEqual({
      "aria-pressed": false,
      "aria-disabled": true,
      "data-pressed": undefined,
      "data-disabled": "",
      "tabindex": undefined,
    });
  });
});

describe("isToggleActivationKey", () => {
  it("accepts Enter and Space only", () => {
    expect(isToggleActivationKey("Enter")).toBe(true);
    expect(isToggleActivationKey(" ")).toBe(true);
    expect(isToggleActivationKey("a")).toBe(false);
    expect(isToggleActivationKey("ArrowRight")).toBe(false);
  });
});

describe("rovingIndexFromKey", () => {
  it("moves forward and back along the orientation", () => {
    expect(rovingIndexFromKey(group({ activeIndex: 0 }), "ArrowRight")).toBe(1);
    expect(rovingIndexFromKey(group({ activeIndex: 1 }), "ArrowLeft")).toBe(0);
  });
  it("ignores the off-axis arrows", () => {
    expect(rovingIndexFromKey(group(), "ArrowDown")).toBeUndefined();
    expect(rovingIndexFromKey(group({ orientation: "vertical" }), "ArrowRight")).toBeUndefined();
  });
  it("reverses horizontal arrows in rtl", () => {
    expect(rovingIndexFromKey(group({ activeIndex: 1, dir: "rtl" }), "ArrowRight")).toBe(0);
  });
  it("wraps when looping", () => {
    expect(rovingIndexFromKey(group({ activeIndex: 2 }), "ArrowRight")).toBe(0);
    expect(rovingIndexFromKey(group({ activeIndex: 0 }), "ArrowLeft")).toBe(2);
  });
  it("stops at the ends when not looping", () => {
    expect(rovingIndexFromKey(group({ activeIndex: 2, loop: false }), "ArrowRight")).toBe(2);
    expect(rovingIndexFromKey(group({ activeIndex: 0, loop: false }), "ArrowLeft")).toBe(0);
  });
  it("jumps to the ends with Home and End", () => {
    expect(rovingIndexFromKey(group({ activeIndex: 1 }), "Home")).toBe(0);
    expect(rovingIndexFromKey(group({ activeIndex: 1 }), "End")).toBe(2);
  });
  it("returns undefined for an empty group", () => {
    expect(rovingIndexFromKey(group({ count: 0 }), "ArrowRight")).toBeUndefined();
  });
});

describe("rovingTabIndex", () => {
  it("gives the tab stop to the active item only", () => {
    expect(rovingTabIndex(group({ activeIndex: 1 }), 1)).toBe(0);
    expect(rovingTabIndex(group({ activeIndex: 1 }), 0)).toBe(-1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/primitives/test/toggle.test.ts`
Expected: FAIL — `Cannot find module '../src/toggle'`

- [ ] **Step 3: Implement `src/toggle.ts`**

```ts
export interface ToggleAriaAttributes {
  "aria-pressed": boolean;
  "aria-disabled": true | undefined;
  "data-pressed": "" | undefined;
  "data-disabled": "" | undefined;
  "tabindex": 0 | undefined;
}

export function toggleAria(pressed: boolean, disabled: boolean): ToggleAriaAttributes {
  return {
    "aria-pressed": pressed,
    "aria-disabled": disabled ? true : undefined,
    "data-pressed": pressed ? "" : undefined,
    "data-disabled": disabled ? "" : undefined,
    "tabindex": disabled ? undefined : 0,
  };
}

export function isToggleActivationKey(key: string): boolean {
  return key === "Enter" || key === " ";
}

export interface ToggleGroupState {
  activeIndex: number;
  count: number;
  orientation: "horizontal" | "vertical";
  dir: "ltr" | "rtl";
  loop: boolean;
}

export function rovingIndexFromKey(state: ToggleGroupState, key: string): number | undefined {
  if (state.count <= 0) return undefined;
  if (key === "Home") return 0;
  if (key === "End") return state.count - 1;

  const forward = state.orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
  const backward = state.orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
  if (key !== forward && key !== backward) return undefined;

  let delta = key === forward ? 1 : -1;
  // Unlike a slider, a roving group mirrors only its horizontal traversal.
  if (state.orientation === "horizontal" && state.dir === "rtl") delta = -delta;

  const next = state.activeIndex + delta;
  if (state.loop) return (next % state.count + state.count) % state.count;
  return Math.max(0, Math.min(state.count - 1, next));
}

export function rovingTabIndex(state: ToggleGroupState, index: number): 0 | -1 {
  return index === state.activeIndex ? 0 : -1;
}
```

- [ ] **Step 4: Export from the index**

```ts
export * from "./toggle";
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun test packages/primitives/test/toggle.test.ts`
Expected: PASS, 11 tests

- [ ] **Step 6: Run the whole suite and build, then commit**

Run: `bun test` — expect 1003 + the ~98 new primitives tests, still 0 fail.
Run: `bun run --cwd packages/primitives build` — expect exit 0.

```bash
git add packages/primitives
git commit -m "feat(primitives): add toggle and roving focus state machines"
```

---

### Task 10: Migrate `@urcolor/react` onto primitives

**Files:**
- Modify: `packages/react/src/utils.ts`
- Modify: `packages/react/package.json` (add dependency)
- Modify: `packages/react/vite.config.ts` (add external)
- Modify: every `*Gradient.tsx` under `packages/react/src/components/` that declares a local `renderToCanvas`

**Interfaces:**
- Consumes: everything from Task 1–9
- Produces: no new public API. `packages/react/src/utils.ts` keeps its exact current export names so no call site changes.

- [ ] **Step 1: Confirm the baseline**

Run: `bun test packages/react`
Record the pass count. It must be identical at the end of this task.

- [ ] **Step 2: Add the dependency**

In `packages/react/package.json`, add to `dependencies`:

```json
"@urcolor/primitives": "workspace:*"
```

In `packages/react/vite.config.ts`, add `"@urcolor/primitives"` to `rollupOptions.external`.

Run: `bun install`

- [ ] **Step 3: Replace `packages/react/src/utils.ts` with re-exports**

```ts
export {
  clamp,
  getDecimalCount,
  roundValue,
  snapToStep,
  linearScale,
  convertValueToPercentage,
  getThumbInBoundsOffset,
  getClosestThumbIndex,
  hasMinStepsBetweenValues,
} from "@urcolor/primitives";

export { PAGE_KEYS, ARROW_KEYS } from "@urcolor/primitives";

export { CHECKERBOARD_BACKGROUND, warnCheckerboardDeprecated } from "@urcolor/primitives";
```

- [ ] **Step 4: Run the react tests**

Run: `bun test packages/react`
Expected: identical pass count to Step 1

- [ ] **Step 5: Replace the duplicated `renderToCanvas` definitions**

Find them:

```bash
grep -rln "function renderToCanvas" packages/react/src
```

In each file, delete the local `renderToCanvas` function and import the shared one, adapting the call site to the options-object signature:

```ts
import { renderToCanvas } from "@urcolor/primitives";
// was: renderToCanvas(canvas, pixels, sampleW, sampleH)
renderToCanvas({ canvas, pixels, sampleWidth: sampleW, sampleHeight: sampleH });
```

- [ ] **Step 6: Run the react tests and type check**

Run: `bun test packages/react`
Expected: identical pass count to Step 1

Run: `bun run --cwd packages/react build`
Expected: exit 0

- [ ] **Step 7: Commit**

```bash
git add packages/react bun.lock
git commit -m "refactor(react): consume shared helpers from @urcolor/primitives"
```

---

### Task 11: Migrate `@urcolor/vue` onto primitives

**Files:**
- Modify: `packages/vue/src/shared/utils.ts`
- Modify: `packages/vue/src/shared/channel-labels.ts`
- Modify: `packages/vue/package.json`, `packages/vue/vite.config.ts`
- Modify: every `*Gradient.vue` that declares a local canvas render helper

**Interfaces:**
- Consumes: Tasks 1–9
- Produces: no new public API; existing export names preserved

- [ ] **Step 1: Confirm the baseline**

Run: `bun test packages/vue`
Record the pass count.

- [ ] **Step 2: Add the dependency**

Add `"@urcolor/primitives": "workspace:*"` to `packages/vue/package.json` dependencies, add it to `external` in `packages/vue/vite.config.ts`, then run `bun install`.

- [ ] **Step 3: Re-export the math half of `shared/utils.ts`**

`packages/vue/src/shared/utils.ts` also contains Vue-specific code (`defineComponent`, `h`, `inject`, `provide`, reka-ui `Slot`). Delete **only** the pure functions — `clamp`, `getDecimalCount`, `roundValue`, `snapToStep`, `linearScale`, `convertValueToPercentage`, `getLabel`, `getThumbInBoundsOffset`, `getClosestThumbIndex`, `hasMinStepsBetweenValues` — and re-export them at the top of the file instead:

```ts
export {
  clamp,
  getDecimalCount,
  roundValue,
  snapToStep,
  linearScale,
  convertValueToPercentage,
  getLabel,
  getThumbInBoundsOffset,
  getClosestThumbIndex,
  hasMinStepsBetweenValues,
} from "@urcolor/primitives";
```

Leave every Vue-dependent export in place untouched.

- [ ] **Step 4: Re-export `channel-labels.ts`**

Replace the body of `packages/vue/src/shared/channel-labels.ts` with:

```ts
export { channelLabel, formatChannelValue } from "@urcolor/primitives";
```

- [ ] **Step 5: Run the vue tests**

Run: `bun test packages/vue`
Expected: identical pass count to Step 1

- [ ] **Step 6: Point the canvas helpers at primitives**

Run `grep -rln "OffscreenCanvas" packages/vue/src` and replace each local implementation with `renderToCanvas` from `@urcolor/primitives`, as in Task 10 Step 5. `packages/vue/src/shared/useGradientCanvas.ts` is the main site.

- [ ] **Step 7: Run the full suite and build**

Run: `bun test`
Expected: 0 fail, total pass count ≥ baseline

Run: `bun run --cwd packages/vue build`
Expected: exit 0

- [ ] **Step 8: Commit**

```bash
git add packages/vue bun.lock
git commit -m "refactor(vue): consume shared helpers from @urcolor/primitives"
```

---

## Phase 2 — Combined Thumb in `@urcolor/react`

Depends on Task 3 (`labels.ts`). Independent of Phases 3 and 4.

### Task 12: Merge `ColorWheelThumb`

**Files:**
- Modify: `packages/react/src/components/color-wheel/thumb/ColorWheelThumb.tsx`
- Modify: `packages/react/src/components/color-wheel/thumb/ColorWheelThumb.test.tsx`
- Modify: `packages/react/src/components/color-wheel/root/ColorWheelRootContext.ts`
- Modify: `packages/react/src/components/color-wheel/root/ColorWheelRoot.tsx`
- Modify: `packages/react/src/components/color-wheel/index.ts`, `index.parts.ts`
- Delete: `packages/react/src/components/color-wheel/thumb-x/`, `packages/react/src/components/color-wheel/thumb-y/`

**Interfaces:**
- Consumes: `channelLabel`, `formatChannelValue` from `@urcolor/primitives`
- Produces: `ColorWheelContextValue` **without** `activeDirection`, `setActiveDirection`, `thumbXElement`, `thumbYElement`. All other members unchanged. `ColorWheelThumb` gains `role="slider"`.

- [ ] **Step 1: Write the failing test**

Replace `packages/react/src/components/color-wheel/thumb/ColorWheelThumb.test.tsx`:

```tsx
import { describe, it, expect } from "bun:test";
import { render } from "@testing-library/react";
import { Color } from "@urcolor/core";
import { ColorWheelRoot } from "../root/ColorWheelRoot";
import { ColorWheelThumb } from "./ColorWheelThumb";

function renderThumb(props: { disabled?: boolean } = {}) {
  return render(
    <ColorWheelRoot value={Color.parse("hsl(210, 80%, 50%)")!} disabled={props.disabled}>
      <ColorWheelThumb data-testid="thumb" />
    </ColorWheelRoot>,
  );
}

describe("ColorWheelThumb", () => {
  it("is defined", () => {
    expect(ColorWheelThumb).toBeDefined();
  });

  it("is a focusable slider", () => {
    const { getByTestId } = renderThumb();
    const thumb = getByTestId("thumb");
    expect(thumb.getAttribute("role")).toBe("slider");
    expect(thumb.getAttribute("tabindex")).toBe("0");
  });

  it("announces both channels in aria-label", () => {
    const { getByTestId } = renderThumb();
    expect(getByTestId("thumb").getAttribute("aria-label")).toBe("Hue, Saturation");
  });

  it("announces both channel values in aria-valuetext", () => {
    const { getByTestId } = renderThumb();
    const text = getByTestId("thumb").getAttribute("aria-valuetext");
    expect(text).toContain("Hue");
    expect(text).toContain("Saturation");
  });

  it("reports the angle channel as aria-valuenow", () => {
    const { getByTestId } = renderThumb();
    const thumb = getByTestId("thumb");
    expect(thumb.getAttribute("aria-valuenow")).toBeTruthy();
    expect(thumb.getAttribute("aria-valuemin")).toBeTruthy();
    expect(thumb.getAttribute("aria-valuemax")).toBeTruthy();
  });

  it("carries the 2D slider role description", () => {
    const { getByTestId } = renderThumb();
    expect(getByTestId("thumb").getAttribute("aria-roledescription")).toBe("Color thumb");
  });

  it("drops the tab stop when disabled", () => {
    const { getByTestId } = renderThumb({ disabled: true });
    const thumb = getByTestId("thumb");
    expect(thumb.hasAttribute("tabindex")).toBe(false);
    expect(thumb.getAttribute("data-disabled")).toBe("");
  });

  it("lets an explicit aria-label win", () => {
    const { getByTestId } = render(
      <ColorWheelRoot value={Color.parse("hsl(210, 80%, 50%)")!}>
        <ColorWheelThumb data-testid="thumb" aria-label="Pick a colour" />
      </ColorWheelRoot>,
    );
    expect(getByTestId("thumb").getAttribute("aria-label")).toBe("Pick a colour");
  });
});
```

If `@testing-library/react` is not a devDependency of the react package, add it in this step and run `bun install`. The repo already has `@testing-library/vue` and `happy-dom` at the root, so the DOM environment is configured.

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/react/src/components/color-wheel`
Expected: FAIL — role is null, `aria-label` is null

- [ ] **Step 3: Rewrite `ColorWheelThumb.tsx`**

Merge the positioning from the current `ColorWheelThumb` with the role/focus/ARIA from `ColorWheelThumbX`, and take the combined-label shape from `packages/vue/src/components/ColorWheel/ColorWheelThumb.vue`:

```tsx
import { forwardRef, useEffect, useMemo, useRef, type ComponentPropsWithoutRef } from "react";
import { channelLabel, formatChannelValue } from "@urcolor/primitives";
import { useColorWheelContext } from "../root/ColorWheelRootContext";

export interface ColorWheelThumbProps extends ComponentPropsWithoutRef<"span"> {}

export const ColorWheelThumb = forwardRef<HTMLSpanElement, ColorWheelThumbProps>(
  function ColorWheelThumb({ style, children, ...props }, ref) {
    const ctx = useColorWheelContext();
    const elRef = useRef<HTMLSpanElement | null>(null);

    useEffect(() => {
      ctx.thumbElement.current = elRef.current ?? undefined;
      return () => {
        if (ctx.thumbElement.current === elRef.current) ctx.thumbElement.current = undefined;
      };
    }, [ctx]);

    const angleDeg = useMemo(() => {
      const range = ctx.angleMax - ctx.angleMin;
      if (range === 0) return ctx.startAngle;
      return ((ctx.currentAngleValue - ctx.angleMin) / range) * 360 + ctx.startAngle;
    }, [ctx.currentAngleValue, ctx.angleMin, ctx.angleMax, ctx.startAngle]);

    const radiusPercent = useMemo(() => {
      const range = ctx.radiusMax - ctx.radiusMin;
      if (range === 0) return 0;
      return ((ctx.currentRadiusValue - ctx.radiusMin) / range) * 50;
    }, [ctx.currentRadiusValue, ctx.radiusMin, ctx.radiusMax]);

    const angleLabelText = channelLabel(ctx.colorSpace, ctx.angleChannelKey);
    const radiusLabelText = channelLabel(ctx.colorSpace, ctx.radiusChannelKey);
    const ariaLabel = `${angleLabelText}, ${radiusLabelText}`;
    const ariaValueText
      = `${angleLabelText} ${formatChannelValue(ctx.colorSpace, ctx.angleChannelKey, ctx.currentAngleValue)}, `
      + `${radiusLabelText} ${formatChannelValue(ctx.colorSpace, ctx.radiusChannelKey, ctx.currentRadiusValue)}`;

    return (
      <span
        ref={(el) => {
          elRef.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        role="slider"
        tabIndex={ctx.disabled ? undefined : 0}
        aria-label={ariaLabel}
        aria-valuenow={ctx.currentAngleValue}
        aria-valuemin={ctx.angleMin}
        aria-valuemax={ctx.angleMax}
        aria-valuetext={ariaValueText}
        aria-roledescription="Color thumb"
        aria-disabled={ctx.disabled || undefined}
        data-disabled={ctx.disabled ? "" : undefined}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `rotate(${angleDeg}deg) translateY(-${radiusPercent}cqmin) translate(-50%, -50%)`,
          transformOrigin: "0 0",
          ...style,
        }}
        {...props}
      >
        {children}
      </span>
    );
  },
);
```

`{...props}` is spread **after** the ARIA attributes so a consumer-supplied `aria-label` wins, which is what the last test asserts.

- [ ] **Step 4: Update the root context**

In `ColorWheelRootContext.ts`: delete `ActiveDirection`, `activeDirection`, `setActiveDirection`, `thumbXElement`, `thumbYElement`. Add:

```ts
thumbElement: React.MutableRefObject<HTMLElement | undefined>;
```

In `ColorWheelRoot.tsx`: delete the `activeDirection` state and both `setActiveDirection(...)` calls inside `handleKeyDown` (the keyboard logic itself is already root-level and stays exactly as it is). Replace the `thumbXElement`/`thumbYElement` refs with a single `thumbElement` ref and update `ctxValue`.

- [ ] **Step 5: Delete the split parts and update the barrels**

```bash
git rm -r packages/react/src/components/color-wheel/thumb-x packages/react/src/components/color-wheel/thumb-y
```

Remove the `ColorWheelThumbX` and `ColorWheelThumbY` lines from `color-wheel/index.ts` and `color-wheel/index.parts.ts`.

- [ ] **Step 6: Run the tests**

Run: `bun test packages/react`
Expected: PASS, 0 fail. Two 1-test files are gone; the thumb file gained 7 tests.

- [ ] **Step 7: Type check and commit**

Run: `bun run --cwd packages/react build`
Expected: exit 0

```bash
git add -A packages/react
git commit -m "feat(react)!: merge ColorWheelThumbX/Y into a single ColorWheelThumb

BREAKING CHANGE: ColorWheelThumbX and ColorWheelThumbY are removed.
ColorWheelThumb is now the focusable role=slider control and announces
both channels through aria-label and aria-valuetext."
```

---

### Task 13: Merge `ColorTriangleThumb`

**Files:**
- Modify: `packages/react/src/components/color-triangle/thumb/ColorTriangleThumb.tsx` and its test
- Modify: `packages/react/src/components/color-triangle/root/ColorTriangleRootContext.ts`, `ColorTriangleRoot.tsx`
- Modify: `packages/react/src/components/color-triangle/index.ts`, `index.parts.ts`
- Delete: `thumb-x/`, `thumb-y/`, `thumb-z/`

**Interfaces:**
- Consumes: `channelLabel`, `formatChannelValue` from `@urcolor/primitives`; `barycentricToCartesian`, `insetTriangle` from `@urcolor/core`
- Produces: `ColorTriangleContextValue` **without** `activeDirection`, `setActiveDirection`, `thumbXElement`, `thumbYElement`, `thumbZElement`. It already has `thumbElement`, which stays. All other members unchanged.

- [ ] **Step 1: Write the failing test**

Replace `packages/react/src/components/color-triangle/thumb/ColorTriangleThumb.test.tsx`:

```tsx
import { describe, it, expect } from "bun:test";
import { render } from "@testing-library/react";
import { Color } from "@urcolor/core";
import { ColorTriangleRoot } from "../root/ColorTriangleRoot";
import { ColorTriangleThumb } from "./ColorTriangleThumb";

function renderThumb(props: { disabled?: boolean } = {}) {
  return render(
    <ColorTriangleRoot value={Color.parse("hsl(210, 80%, 50%)")!} disabled={props.disabled}>
      <ColorTriangleThumb data-testid="thumb" />
    </ColorTriangleRoot>,
  );
}

describe("ColorTriangleThumb", () => {
  it("is defined", () => {
    expect(ColorTriangleThumb).toBeDefined();
  });

  it("is a focusable slider", () => {
    const { getByTestId } = renderThumb();
    expect(getByTestId("thumb").getAttribute("role")).toBe("slider");
    expect(getByTestId("thumb").getAttribute("tabindex")).toBe("0");
  });

  it("announces every active channel in aria-label", () => {
    const { getByTestId } = renderThumb();
    const label = getByTestId("thumb").getAttribute("aria-label")!;
    expect(label.split(", ").length).toBeGreaterThanOrEqual(2);
  });

  it("announces channel values in aria-valuetext", () => {
    const { getByTestId } = renderThumb();
    expect(getByTestId("thumb").getAttribute("aria-valuetext")).toContain(",");
  });

  it("carries the role description and x-channel value bounds", () => {
    const { getByTestId } = renderThumb();
    const thumb = getByTestId("thumb");
    expect(thumb.getAttribute("aria-roledescription")).toBe("Color thumb");
    expect(thumb.getAttribute("aria-valuemin")).toBeTruthy();
    expect(thumb.getAttribute("aria-valuemax")).toBeTruthy();
  });

  it("drops the tab stop when disabled", () => {
    const { getByTestId } = renderThumb({ disabled: true });
    expect(getByTestId("thumb").hasAttribute("tabindex")).toBe(false);
  });

  it("lets an explicit aria-label win", () => {
    const { getByTestId } = render(
      <ColorTriangleRoot value={Color.parse("hsl(210, 80%, 50%)")!}>
        <ColorTriangleThumb data-testid="thumb" aria-label="Pick a colour" />
      </ColorTriangleRoot>,
    );
    expect(getByTestId("thumb").getAttribute("aria-label")).toBe("Pick a colour");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/react/src/components/color-triangle`
Expected: FAIL — role is null

- [ ] **Step 3: Rewrite `ColorTriangleThumb.tsx`**

Keep the existing barycentric positioning logic exactly as it is. Add role, tabindex, and ARIA, taking the three-channel label shape from `packages/vue/src/components/ColorTriangle/ColorTriangleThumb.vue:95-115`:

```tsx
const labels = ctx.isThreeChannel
  ? [
      channelLabel(ctx.colorSpace, ctx.xChannelKey),
      channelLabel(ctx.colorSpace, ctx.yChannelKey),
      channelLabel(ctx.colorSpace, ctx.zChannelKey ?? ""),
    ]
  : [
      channelLabel(ctx.colorSpace, ctx.xChannelKey),
      channelLabel(ctx.colorSpace, ctx.yChannelKey),
    ];

const ariaLabel = labels.join(", ");

const valueParts = [
  `${labels[0]} ${formatChannelValue(ctx.colorSpace, ctx.xChannelKey, ctx.currentXValue)}`,
  `${labels[1]} ${formatChannelValue(ctx.colorSpace, ctx.yChannelKey, ctx.currentYValue)}`,
];
if (ctx.isThreeChannel) {
  valueParts.push(`${labels[2]} ${formatChannelValue(ctx.colorSpace, ctx.zChannelKey ?? "", ctx.currentZValue)}`);
}
const ariaValueText = valueParts.join(", ");
```

Applied to the rendered element, with `{...props}` spread last:

```tsx
role="slider"
tabIndex={ctx.disabled ? undefined : 0}
aria-label={ariaLabel}
aria-valuenow={ctx.currentXValue}
aria-valuemin={ctx.xMin}
aria-valuemax={ctx.xMax}
aria-valuetext={ariaValueText}
aria-roledescription="Color thumb"
aria-disabled={ctx.disabled || undefined}
data-disabled={ctx.disabled ? "" : undefined}
```

- [ ] **Step 4: Update the root context**

In `ColorTriangleRootContext.ts`: delete `ActiveDirection`, `activeDirection`, `setActiveDirection`, `thumbXElement`, `thumbYElement`, `thumbZElement`. Keep `thumbElement`, which the positioning code already uses for `contain` alignment.

In `ColorTriangleRoot.tsx`: delete the `activeDirection` state and every `setActiveDirection(...)` call. Leave the keyboard handler otherwise unchanged.

- [ ] **Step 5: Delete the split parts and update the barrels**

```bash
git rm -r packages/react/src/components/color-triangle/thumb-x \
          packages/react/src/components/color-triangle/thumb-y \
          packages/react/src/components/color-triangle/thumb-z
```

Remove `ColorTriangleThumbX`, `ColorTriangleThumbY`, `ColorTriangleThumbZ` from `index.ts` and `index.parts.ts`.

- [ ] **Step 6: Run the full suite**

Run: `bun test`
Expected: 0 fail

- [ ] **Step 7: Type check and commit**

Run: `bun run --cwd packages/react build`
Expected: exit 0

```bash
git add -A packages/react
git commit -m "feat(react)!: merge ColorTriangleThumbX/Y/Z into a single ColorTriangleThumb

BREAKING CHANGE: ColorTriangleThumbX, ColorTriangleThumbY and
ColorTriangleThumbZ are removed. ColorTriangleThumb is now the focusable
role=slider control and announces every active channel."
```

---

## Phase 3 — `@urcolor/svelte`

Depends on Phase 1. Independent of Phases 2 and 4. Tests are out of scope; each task verifies with a build and `svelte-check`.

### Task 14: Svelte package scaffold

**Files:**
- Create: `packages/svelte/package.json`, `svelte.config.js`, `tsconfig.json`
- Create: `packages/svelte/src/lib/index.ts`

**Interfaces:**
- Consumes: `@urcolor/core`, `@urcolor/primitives`
- Produces: a buildable empty package; `bun run --cwd packages/svelte build` exits 0

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@urcolor/svelte",
  "version": "0.0.1",
  "type": "module",
  "svelte": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "svelte": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "publishConfig": { "access": "public" },
  "scripts": {
    "build": "svelte-package -i src/lib -o dist",
    "check": "svelte-check --tsconfig ./tsconfig.json"
  },
  "keywords": ["color", "color-picker", "svelte", "svelte5", "headless", "accessible", "oklch", "color-slider", "color-wheel"],
  "author": { "name": "GrandMagus", "url": "https://github.com/GrandMagus02" },
  "homepage": "https://urcolor.vercel.app/",
  "repository": { "type": "git", "url": "https://github.com/ur-color/urcolor", "directory": "packages/svelte" },
  "bugs": { "url": "https://github.com/ur-color/urcolor/issues" },
  "dependencies": {
    "@urcolor/core": "workspace:*",
    "@urcolor/primitives": "workspace:*"
  },
  "peerDependencies": { "svelte": "^5.29" },
  "devDependencies": {
    "@sveltejs/package": "^2",
    "svelte": "^5.29",
    "svelte-check": "^4",
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: Create `svelte.config.js` and `tsconfig.json`**

```js
// svelte.config.js
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
export default { preprocess: vitePreprocess() };
```

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": { "noEmit": true },
  "include": ["src/**/*.ts", "src/**/*.svelte"]
}
```

- [ ] **Step 3: Create a placeholder entry**

`packages/svelte/src/lib/index.ts`:

```ts
export {};
```

- [ ] **Step 4: Install and build**

Run: `bun install && bun run --cwd packages/svelte build`
Expected: exit 0, `packages/svelte/dist/` created

If `@sveltejs/vite-plugin-svelte` is not resolvable, add it to devDependencies and re-run.

- [ ] **Step 5: Commit**

```bash
git add packages/svelte bun.lock
git commit -m "chore(svelte): scaffold @urcolor/svelte package"
```

---

### Task 15: Svelte shared context and attachment helpers

**Files:**
- Create: `packages/svelte/src/lib/shared/context.ts`
- Create: `packages/svelte/src/lib/shared/child.ts`
- Create: `packages/svelte/src/lib/shared/gradient.svelte.ts`

**Interfaces:**
- Consumes: `createDragController`, `renderToCanvas`, `CHECKERBOARD_BACKGROUND` from `@urcolor/primitives`
- Produces:
  ```ts
  // context.ts
  export function createContextPair<T>(name: string): {
    set(value: T): void
    get(): T
  }
  // child.ts — the props object handed to a `child` snippet
  export type ChildProps = Record<string, unknown>
  export interface ChildSnippetArgs { props: ChildProps }
  // gradient.svelte.ts
  export function gradientAttachment(render: (canvas: HTMLCanvasElement) => void): (node: HTMLCanvasElement) => () => void
  ```

`createContextPair` wraps `setContext`/`getContext` with a `Symbol` key and throws a named error from `get()` when called outside a root, matching React's `"ColorSlider.* must be used within ColorSliderRoot"` message shape.

`gradientAttachment` returns an attachment that calls `render` when the canvas mounts and re-runs whenever the reactive state read inside `render` changes. It also attaches a `ResizeObserver` and disconnects it on cleanup.

- [ ] **Step 1: Implement the three files**

```ts
// packages/svelte/src/lib/shared/context.ts
import { getContext, setContext } from "svelte";

export function createContextPair<T>(name: string) {
  const key = Symbol(name);
  return {
    set(value: T): void {
      setContext(key, value);
    },
    get(): T {
      const value = getContext<T | undefined>(key);
      if (value === undefined) throw new Error(`${name}.* must be used within ${name}Root`);
      return value;
    },
  };
}
```

```ts
// packages/svelte/src/lib/shared/child.ts
export type ChildProps = Record<string, unknown>;
export interface ChildSnippetArgs {
  props: ChildProps;
}
```

```ts
// packages/svelte/src/lib/shared/gradient.svelte.ts
export function gradientAttachment(render: (canvas: HTMLCanvasElement) => void) {
  return (node: HTMLCanvasElement) => {
    // Reading reactive state inside `render` makes this attachment re-run on
    // change; that is the whole reason gradients use an attachment rather than
    // an onMount.
    render(node);
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => render(node))
      : undefined;
    observer?.observe(node);
    return () => observer?.disconnect();
  };
}
```

- [ ] **Step 2: Export from the barrel**

`packages/svelte/src/lib/index.ts`:

```ts
export { createContextPair } from "./shared/context.js";
export type { ChildProps, ChildSnippetArgs } from "./shared/child.js";
export { gradientAttachment } from "./shared/gradient.svelte.js";
```

- [ ] **Step 3: Build and check**

Run: `bun run --cwd packages/svelte build && bun run --cwd packages/svelte check`
Expected: exit 0 both

- [ ] **Step 4: Commit**

```bash
git add packages/svelte
git commit -m "feat(svelte): add shared context, child snippet types and gradient attachment"
```

---

### Tasks 16–22: Svelte component families

These seven tasks are **structurally identical** and **mutually independent** — they may run in parallel. Each ports one family from its React source.

**Shared requirements for every family task:**

1. Create `packages/svelte/src/lib/components/<family>/` mirroring the React directory names exactly.
2. Each part is a `.svelte` file named after its React counterpart (`ColorSliderRoot.svelte` for `ColorSliderRoot.tsx`).
3. Root components:
   - Take `value` as `$bindable()`, plus `defaultValue`, `onValueChange`, `onValueCommit`.
   - Hold state in `$state`, derive with `$derived`.
   - Publish context with `createContextPair` from Task 15.
   - Attach pointer/keyboard behavior through **one attachment** built over `createDragController` (and `valueFromPosition`/`valueFromKey` for the slider), never as `onpointerdown`-style props.
4. Every part accepts an optional `child` snippet. When present, render `{@render child({ props })}` instead of the default element; when absent, render the default element with `{...props}`. The `props` object carries the attachment under its `Symbol` key so it survives spreading.
5. Rest props spread onto the element; `class` and `style` pass through.
6. `data-*` attribute names come from `@urcolor/primitives`, never as string literals.
7. **No `Checkerboard` part.** Gradients paint the checkerboard themselves using `CHECKERBOARD_BACKGROUND`.
8. Create `index.ts` (flat exports) and `index.parts.ts` (`export * as ColorX`) matching the React barrels.
9. Add the family's `export *` line to `packages/svelte/src/lib/index.ts`.
10. Verify with `bun run --cwd packages/svelte build && bun run --cwd packages/svelte check`, both exit 0.
11. Commit as `feat(svelte): add <Family> components`.

| Task | Family | React source directory | Parts |
|---|---|---|---|
| 16 | ColorSlider | `packages/react/src/components/color-slider/` | Root, Control, Track, Range, Thumb, Gradient |
| 17 | ColorArea | `packages/react/src/components/color-area/` | Root, Gradient, Thumb |
| 18 | ColorField | `packages/react/src/components/color-field/` | Root, Input, Increment, Decrement, Swatch |
| 19 | ColorSwatch | `packages/react/src/components/color-swatch/` | single `ColorSwatch` component |
| 20 | ColorSwatchGroup | `packages/react/src/components/color-swatch-group/` | Root |
| 21 | ColorRing | `packages/react/src/components/color-ring/` | Root, Track, Gradient, Thumb |
| 22 | ColorWheel + ColorTriangle | `packages/react/src/components/color-wheel/`, `color-triangle/` | Root, Gradient, Thumb each |

**Task 16 note (ColorSlider):** React's Root delegates to base-ui's `Slider.Root`. The Svelte Root has no such delegate — it composes `valueFromPosition`, `valueFromKey`, and `sliderAria` from `@urcolor/primitives` directly. Read `packages/react/src/components/color-slider/root/ColorSliderRoot.tsx` for the color-channel logic (`ALPHA_CONFIG`, `displayToNative`/`nativeToDisplay` round-trip) — that part ports directly, now via `colorToDisplayValue`/`applyDisplayValue` from `@urcolor/primitives`.

**Task 19/20 note (Swatch):** React delegates to base-ui `Toggle`/`ToggleGroup`. Svelte uses `toggleAria`, `isToggleActivationKey`, `rovingIndexFromKey`, `rovingTabIndex` from `@urcolor/primitives`.

**Task 22 note (Wheel/Triangle):** These two ship a **single combined `Thumb`** — the Phase 2 target model. Port from `packages/vue/src/components/ColorWheel/ColorWheelThumb.vue` and `ColorTriangleThumb.vue`, which already have that shape, rather than from React (whose merge may not have landed yet if the phases run in parallel). Keyboard mapping: `ArrowLeft`/`ArrowRight` → x, `ArrowUp`/`ArrowDown` → y, `shiftKey` → 10×, `PageUp`/`PageDown` → 10× on y, `Home`/`End` → both axes to their bounds.

---

### Task 23: Svelte hooks

**Files:**
- Create: `packages/svelte/src/lib/hooks/useColor.svelte.ts`, `useColorSpace.svelte.ts`, and one file per color space
- Modify: `packages/svelte/src/lib/index.ts`

**Interfaces:**
- Consumes: `Color` from `@urcolor/core`; `parseColor` from `@urcolor/primitives`
- Produces: 14 hooks matching React's public export list — `useColor`, `useColorSpace`, `useRGB`, `useHSL`, `useHSV`, `useHWB`, `useOKLCh`, `useOKLab`, `useLCh`, `useLab`, `useP3`, `useA98`, `useProPhoto`, `useRec2020`

`useColor` returns an object with getters and setters over `$state`, mirroring `packages/react/src/hooks/useColor.ts`:

```ts
export interface UseColorReturn {
  readonly color: Color
  setColor(next: Color | ((prev: Color) => Color)): void
  readonly hex: string
  setHex(hex: string): void
  readonly alpha: number
  setAlpha(alpha: number): void
}
```

- [ ] **Step 1: Port each hook from `packages/react/src/hooks/`**

Replace `useState`/`useMemo`/`useCallback` with `$state`/`$derived` and plain methods. React's `useEffect` resync-on-input-change has no Svelte equivalent and is not needed — the caller owns the input.

- [ ] **Step 2: Export from the barrel, build and check**

Run: `bun run --cwd packages/svelte build && bun run --cwd packages/svelte check`
Expected: exit 0 both

- [ ] **Step 3: Commit**

```bash
git add packages/svelte
git commit -m "feat(svelte): add colour hooks"
```

---

## Phase 4 — `@urcolor/angular`

Depends on Phase 1. Independent of Phases 2 and 3.

### Task 24: Angular package scaffold

**Files:**
- Create: `packages/angular/package.json`, `ng-package.json`, `tsconfig.lib.json`
- Create: `packages/angular/src/index.ts`

**Interfaces:**
- Consumes: `@urcolor/core`, `@urcolor/primitives`
- Produces: a buildable empty package

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@urcolor/angular",
  "version": "0.0.1",
  "type": "module",
  "files": ["dist"],
  "publishConfig": { "access": "public" },
  "scripts": {
    "build": "ng-packagr -p ng-package.json",
    "check": "tsc -p tsconfig.lib.json --noEmit"
  },
  "keywords": ["color", "color-picker", "angular", "headless", "accessible", "signals", "oklch", "color-slider", "color-wheel"],
  "author": { "name": "GrandMagus", "url": "https://github.com/GrandMagus02" },
  "homepage": "https://urcolor.vercel.app/",
  "repository": { "type": "git", "url": "https://github.com/ur-color/urcolor", "directory": "packages/angular" },
  "bugs": { "url": "https://github.com/ur-color/urcolor/issues" },
  "dependencies": {
    "@urcolor/core": "workspace:*",
    "@urcolor/primitives": "workspace:*",
    "tslib": "^2"
  },
  "peerDependencies": {
    "@angular/common": "^21.2",
    "@angular/core": "^21.2",
    "@angular/forms": "^21.2"
  },
  "devDependencies": {
    "@angular/common": "^21.2",
    "@angular/compiler": "^21.2",
    "@angular/compiler-cli": "^21.2",
    "@angular/core": "^21.2",
    "@angular/forms": "^21.2",
    "ng-packagr": "^21.2",
    "typescript": "^5.9"
  }
}
```

- [ ] **Step 2: Create `ng-package.json` and `tsconfig.lib.json`**

```json
{
  "$schema": "../../node_modules/ng-packagr/ng-package.schema.json",
  "dest": "./dist",
  "lib": { "entryFile": "src/index.ts" },
  "allowedNonPeerDependencies": ["@urcolor/core", "@urcolor/primitives"]
}
```

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "declaration": true,
    "experimentalDecorators": false,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "verbatimModuleSyntax": false
  },
  "include": ["src/**/*.ts"],
  "angularCompilerOptions": { "strictTemplates": true }
}
```

The root tsconfig sets `allowImportingTsExtensions` and `verbatimModuleSyntax`, both of which `ngtsc` rejects — hence the overrides.

- [ ] **Step 3: Create a placeholder entry**

`packages/angular/src/index.ts`:

```ts
export {};
```

- [ ] **Step 4: Install and build**

Run: `bun install && bun run --cwd packages/angular build`
Expected: exit 0, `packages/angular/dist/` created

**Already completed and verified.** `ng-packagr@21.2` resolves Bun workspace symlinks and builds `@urcolor/angular` cleanly, so Risk 2 from the spec did not materialise. This task is done; it is retained for the record.

- [ ] **Step 5: Commit**

```bash
git add packages/angular bun.lock
git commit -m "chore(angular): scaffold @urcolor/angular package"
```

---

### Task 25: ~~Verify `@angular/aria` Listbox value semantics~~ — CANCELLED

`@angular/aria` was dropped from the design. It has no release before `22.0.5`, and Angular 22
requires TypeScript 6.0 (beta), which `typescript-eslint@8.55` refuses (`typescript: <6.0.0`).
Angular 21.2 accepts the repo's existing TypeScript 5.9.3.

`ColorSwatchGroup` now uses `@urcolor/primitives` (`toggleAria`, `isToggleActivationKey`,
`rovingIndexFromKey`, `rovingTabIndex`) like every other Angular family. Nothing to investigate,
no notes file, and Task 31 no longer depends on this task.

---

### Tasks 26–32: Angular component families

Structurally identical and mutually independent — all may run in parallel.

**Shared requirements for every family task:**

1. Create `packages/angular/src/components/<family>/` mirroring the React directory names.
2. Files are hyphenated with no suffix: `color-slider-root.ts` exporting `class ColorSliderRoot`.
3. Every part is a **standalone attribute directive** with a `urc`-prefixed camelCase selector.
4. Roots:
   - `readonly value = model<Color>(...)` for `[(value)]`
   - `readonly valueCommit = output<Color>()`
   - `readonly colorSpace = input<SpaceId>("hsl")`, `readonly channel = input<string>(...)` etc.
   - `disabled` comes from the native attribute; `dir` from injected `Directionality`; neither is an `input()`
   - `implements FormValueControl<Color>` — satisfied by the `value` model signal alone
5. Child directives read the root through `inject(ColorSliderRoot)`, not a context object.
6. `data-*` and ARIA attributes are `host: { '[attr.data-disabled]': '...' }` bindings, with names imported from `@urcolor/primitives`.
7. **Canvas work runs inside `afterNextRender()`**, never in a constructor or a plain `effect()` — Angular executes those during SSR.
8. **No `Checkerboard` directive.**
9. Add the family's `export *` to `packages/angular/src/index.ts`.
10. Verify with `bun run --cwd packages/angular build && bun run --cwd packages/angular check`, both exit 0.
11. Commit as `feat(angular): add <Family> directives`.

| Task | Family | React source directory | Directives |
|---|---|---|---|
| 26 | ColorSlider | `color-slider/` | Root, Control, Track, Range, Thumb, Gradient |
| 27 | ColorArea | `color-area/` | Root, Gradient, Thumb |
| 28 | ColorField | `color-field/` | Root, Input, Increment, Decrement, Swatch |
| 29 | ColorRing | `color-ring/` | Root, Track, Gradient, Thumb |
| 30 | ColorWheel + ColorTriangle | `color-wheel/`, `color-triangle/` | Root, Gradient, Thumb each |
| 31 | ColorSwatch + ColorSwatchGroup | `color-swatch/`, `color-swatch-group/` | ColorSwatch, ColorSwatchGroupRoot |

**Task 26 note (ColorSlider):** No base-ui delegate. Compose `valueFromPosition`, `positionFromValue`, `valueFromKey`, `sliderAria` from `@urcolor/primitives`, and `createDragController` for pointer handling.

**Task 30 note (Wheel/Triangle):** Single combined `Thumb` per family. Port the ARIA shape from `packages/vue/src/components/ColorWheel/ColorWheelThumb.vue` and `ColorTriangleThumb.vue`.

**Task 31 note (Swatch):** No `@angular/aria`. `ColorSwatchGroupRoot` implements roving focus with `rovingIndexFromKey` and `rovingTabIndex` from `@urcolor/primitives`, tracking the active item by **index** rather than by comparing `Color` instances (`Color` is immutable, so reference equality would never match). `ColorSwatch` uses `toggleAria` and `isToggleActivationKey`. Mirror whatever the Svelte `ColorSwatchGroup` does so the two stay behaviourally identical.

---

### Task 33: Angular services

**Files:**
- Create: `packages/angular/src/services/` — one file per hook
- Modify: `packages/angular/src/index.ts`

**Interfaces:**
- Consumes: `Color` from `@urcolor/core`; `parseColor` from `@urcolor/primitives`
- Produces: 14 injectables named for React's hooks (`useColor` → `ColorStore` with a `createColorStore()` factory; the 12 space hooks likewise), each signal-backed

- [ ] **Step 1: Port each hook from `packages/react/src/hooks/`, replacing `useState`/`useMemo` with `signal()`/`computed()`**

- [ ] **Step 2: Build and check**

Run: `bun run --cwd packages/angular build && bun run --cwd packages/angular check`
Expected: exit 0 both

- [ ] **Step 3: Commit**

```bash
git add packages/angular
git commit -m "feat(angular): add colour signal stores"
```

---

## Phase 5 — Monorepo wiring

### Task 34: Build ordering, lint, and type checks

**Files:**
- Modify: `package.json` (root)
- Modify: `eslint.config.js`

- [ ] **Step 1: Update the root build script**

```json
"build": "bun run --cwd packages/core build && bun run --cwd packages/primitives build && bun run --cwd packages/relative build && bun run --cwd packages/i18n build && bun run --cwd packages/vue build && bun run --cwd packages/react build && bun run --cwd packages/svelte build && bun run --cwd packages/angular build"
```

- [ ] **Step 2: Add the Svelte ESLint block**

Add `eslint-plugin-svelte` and `svelte-eslint-parser` to root devDependencies, then add to `eslint.config.js` after the existing `**/*.vue` block:

```js
{
  files: ["**/*.svelte"],
  languageOptions: {
    parser: svelteParser,
    parserOptions: {
      parser: tseslint.parser,
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
      extraFileExtensions: [".svelte"],
    },
  },
},
```

Add `"packages/angular/dist/"` and `"packages/svelte/dist/"` to the existing `ignores` array.

- [ ] **Step 3: Update the root lint script**

```json
"lint": "eslint . && vue-tsc --noEmit && bun run --cwd packages/svelte check && bun run --cwd packages/angular check"
```

`vue-tsc --noEmit` reads the root tsconfig, which includes `packages/**/*`. If it now trips on Angular decorator syntax, exclude `packages/angular` from the root tsconfig `include` — Angular type-checks through its own `tsconfig.lib.json`.

- [ ] **Step 4: Verify everything**

Run: `bun install && bun run build`
Expected: exit 0

Run: `bun test`
Expected: 0 fail

Run: `bun run lint`
Expected: exit 0

- [ ] **Step 5: Commit**

```bash
git add package.json eslint.config.js bun.lock
git commit -m "build: wire primitives, svelte and angular into root build and lint"
```

---

## Dependency graph

```
Task 1 (scaffold + math)
  └─ Task 2 (keys) ─ Task 3 (labels) ─ Task 4 (data-attrs) ─ Task 5 (canvas) ─ Task 6 (channel-model)
       └─ Task 7 (drag) ─ Task 8 (slider) ─ Task 9 (toggle)
            ├─ Task 10 (react migration) ─ Task 11 (vue migration)
            ├─ Task 12, 13  (react thumb merge)          [parallel with 14+, 24+]
            ├─ Task 14 ─ Task 15 ─ Tasks 16-22 ‖ ─ Task 23      (svelte)
            └─ Task 24 ─ Tasks 26-32 ‖ ─ Task 33      (angular; Task 25 cancelled)
                                                    └─ Task 34 (wiring, last)
```

Tasks 16–22 are mutually independent. Tasks 26–32 are mutually independent (31 needs 25). Phase 2, Phase 3, and Phase 4 are independent of each other once Phase 1 is complete.

---

## Self-Review

**Spec coverage:**

| Spec section | Tasks |
|---|---|
| `@urcolor/primitives` module table | 1–9 (one task per module) |
| `@urcolor/svelte` layout, props, child snippet, attachments, hooks, build | 14–23 |
| `@urcolor/angular` layout, native props, `FormValueControl`, build | 24–33 |
| Parity matrix (7 families, no Checkerboard) | 16–22, 26–32 |
| Combined Thumb + React breaking change | 12, 13; new packages via 22, 30 |
| Vue/React migration + verification bar | 10, 11 |
| Monorepo wiring | 34 |
| Risk 1 (new slider code) | Task 8, 22 assertions in its test |
| Risk 2 (ng-packagr under Bun) | Task 24 — done, did not materialise |
| Risk 3 (`ngOption` value comparison) | Moot — `@angular/aria` dropped, Task 25 cancelled |
| Risk 4 (SSR) | Task 5 guards; Task 26–32 requirement 7 (`afterNextRender`) |
| Risk 5 (root keyboard) | Tasks 12, 13 Step 4 |

**Placeholder scan:** No TBDs. Tasks 16–22 and 26–32 reference React source directories that exist in the repo rather than inlining ~9k lines of port code; each carries its own parts list, shared requirements, and per-family notes.

**Type consistency:** `renderToCanvas` takes an options object everywhere (Task 5 defines it, Task 10 Step 5 and Task 11 Step 6 adapt call sites). `parseColor` is defined once in Task 6 and consumed by Tasks 23 and 33. `channelLabel`/`formatChannelValue` are defined in Task 3 and consumed by Tasks 12, 13, 22, 30. `thumbElement` replaces `thumbXElement`/`thumbYElement` in both Task 12 and Task 13.

**One correction applied inline:** Task 7's `cancel()` test originally asserted pointer capture release, which `cancel()` cannot do without an event. The step now says to drop that assertion and explains why capture release belongs to the framework adapter.

# `@urcolor/relative` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support CSS Color 5 relative-color syntax (`rgb(from red r g b)`, `oklch(from #ff0000 calc(l * 0.8) c h)`) as an opt-in plugin package over `@urcolor/core`.

**Architecture:** `@urcolor/core` gains three things — a depth-aware body splitter, a public `NOTATIONS` table that becomes the single source of truth for CSS-unit ↔ native-unit conversion, and a parser registry. A new `@urcolor/relative` package then implements a CSS math evaluator and a relative parser, and registers itself through that registry when the consumer calls `registerRelativeColor()`.

**Tech Stack:** TypeScript, Bun (runtime, test runner, bundler), Vite (package builds).

**Spec:** `docs/superpowers/specs/2026-07-19-relative-color-parsing-design.md`

> **Note on Tasks 4 and 5.** Every other step in this plan gives the exact code to write. Those two do not: the math evaluator (~200 lines of recursive-descent parsing) and the relative parser (~150 lines of depth-aware scanning) are specified by their grammar, their behaviour rules, and an exhaustive test suite, rather than transcribed. This is deliberate — transcribed parser code invites copying without understanding, and the tests pin the contract more precisely than prose could. The consequence is that **those two tasks need a capable model**, not the cheap tier appropriate to the mechanical steps elsewhere.

## Global Constraints

- **Use Bun, never npm/node/yarn/pnpm.** `bun test`, `bun run <script>`, `bun install`.
- **Zero runtime dependencies.** `@urcolor/core` keeps `"dependencies": {}`. `@urcolor/relative` depends only on `@urcolor/core` (`"workspace:*"`). Add nothing else.
- **Import specifiers carry no file extension.** Write `from "./types"`, never `from "./types.ts"`. Both packages emit declarations with `tsc --emitDeclarationOnly`; `.ts` specifiers would survive into `dist/*.d.ts` and resolve to nothing.
- **The existing core test suite must stay green with NO assertion edits.** Tasks 1 and 2 refactor code paths that currently work. If an existing test needs its assertions changed to pass, the refactor is wrong — fix the refactor, not the test. Adding *new* tests is always fine.
- **Every failure returns `null`.** No new error types, no thrown exceptions from parsing, no partial results. `tryParse` returns `null`; `parse` throws `SyntaxError` as it already does.
- **`none` resolves to `0`**, matching the library's existing absolute parsers. Do not introduce CSS missing-component semantics.
- **Platform is macOS.** Baseline: 390 tests passing across the repo, `bun run docs:build` exits 0.

---

## File Structure

**Modified — `packages/core/src/color/`:**

| File | Change |
| --- | --- |
| `components.ts` | Depth-aware `/` split; expose raw body; shared `parseChannelToken` |
| `notations.ts` | **NEW** — the `NOTATIONS` table, single source of unit truth |
| `parse.ts` | Parser registry: `registerParser`, `ColorParser` |
| `spaces/srgb.ts`, `hsl.ts`, `hwb.ts`, `lab.ts`, `lch.ts`, `oklab.ts`, `oklch.ts`, `colorFn.ts` | Consume `NOTATIONS` instead of local unit helpers |
| `../index.ts` | Export the new public surface |

**Created — `packages/relative/`:**

| File | Responsibility |
| --- | --- |
| `package.json`, `tsconfig.build.json`, `vite.config.ts` | Package scaffold |
| `src/math.ts` | CSS math expression evaluator (colour-agnostic) |
| `src/scope.ts` | Build a `MathScope` from an origin colour + notation |
| `src/parse.ts` | The relative parser |
| `src/index.ts` | `registerRelativeColor()` |
| `test/math.test.ts`, `test/relative.test.ts` | Tests |

---

## Task 1: Depth-aware body splitting in core

**Files:**
- Modify: `packages/core/src/color/components.ts`
- Test: `packages/core/test/color/components.test.ts` (create)

**Interfaces:**
- Produces: `Components` gains a `body: string` field (the raw inner text). `parseFn` splits alpha at the **first depth-0 `/`** rather than the first `/` anywhere.

`parseFn` currently does `body.indexOf("/")`. That is already fragile and becomes outright wrong once an origin colour carries its own alpha — `rgb(from rgb(1 2 3 / 40%) r g b)` mis-splits at the inner slash. Task 5 depends on this being correct.

- [ ] **Step 1: Write the failing test**

Create `packages/core/test/color/components.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { parseFn } from "../../src/color/components";

describe("parseFn", () => {
  it("splits alpha at a top-level slash", () => {
    const c = parseFn("rgb(1 2 3 / 40%)", "rgba?");
    expect(c?.args).toEqual(["1", "2", "3"]);
    expect(c?.alpha).toBeCloseTo(0.4, 6);
  });

  it("ignores a slash nested inside parentheses", () => {
    const c = parseFn("rgb(from rgb(1 2 3 / 40%) r g b)", "rgba?");
    expect(c?.alpha).toBeUndefined();
    expect(c?.args).toEqual(["from", "rgb(1", "2", "3", "/", "40%)", "r", "g", "b"]);
  });

  it("splits at the top-level slash even when a nested one precedes it", () => {
    const c = parseFn("rgb(from rgb(1 2 3 / 40%) r g b / 50%)", "rgba?");
    expect(c?.alpha).toBeCloseTo(0.5, 6);
  });

  it("exposes the raw body", () => {
    expect(parseFn("rgb(1 2 3)", "rgba?")?.body).toBe("1 2 3");
    expect(parseFn("rgb(from red r g b)", "rgba?")?.body).toBe("from red r g b");
  });

  it("returns null when the notation name does not match", () => {
    expect(parseFn("hsl(1 2 3)", "rgba?")).toBeNull();
  });
});
```

Note the second case's `args` are deliberately ugly — with no top-level slash the whole body is tokenised on whitespace, splitting the nested colour. That is fine and expected: only Task 5's relative parser reads that body, and it uses `body`, not `args`.

- [ ] **Step 2: Run it to confirm it fails**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun test packages/core/test/color/components.test.ts
```

Expected: FAIL on the nested-slash cases and on `body` being `undefined`.

- [ ] **Step 3: Implement**

In `packages/core/src/color/components.ts`, add `body` to the interface:

```ts
/** The channel tokens and alpha extracted from a functional notation body. */
export interface Components {
  /** The raw inner text, before any splitting. */
  body: string;
  args: string[];
  /** `undefined` when no alpha was written (caller defaults to 1). */
  alpha: number | undefined;
}
```

Add a depth-aware scanner above `parseFn`:

```ts
/** Index of the first `/` at parenthesis depth 0, or -1. */
function topLevelSlash(body: string): number {
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "/" && depth === 0) return i;
  }
  return -1;
}
```

Then change `parseFn` to use it and return the body:

```ts
export function parseFn(input: string, name: string): Components | null {
  const re = new RegExp(`^${name}\\(\\s*(.+?)\\s*\\)$`, "i");
  const m = input.trim().match(re);
  const body = m?.[1];
  if (body === undefined) return null;
  const slash = topLevelSlash(body);
  const main = slash >= 0 ? body.slice(0, slash) : body;
  const args = main
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  const alpha = slash >= 0 ? parseAlpha(body.slice(slash + 1).trim()) : undefined;
  return { body, args, alpha };
}
```

- [ ] **Step 4: Run the new test**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun test packages/core/test/color/components.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Confirm no regression — this is the important gate**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun test packages/core
```

Expected: PASS. The regex `^name\(\s*(.+?)\s*\)$` is non-greedy, so `rgb(1 2 3) extra` still fails to match as before. If any existing assertion now fails, the scanner is wrong — fix the scanner.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/color/components.ts packages/core/test/color/components.test.ts
git commit -m "fix(core): split functional-notation alpha at depth 0

parseFn split on the first '/' anywhere in the body, which mis-splits any
notation whose body contains a nested color with its own alpha. Scan for the
first top-level slash instead, and expose the raw body for callers that need
to re-parse it.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: The `NOTATIONS` table

**Files:**
- Create: `packages/core/src/color/notations.ts`
- Create: `packages/core/test/color/notations.test.ts`
- Modify: `packages/core/src/color/components.ts` (add `parseChannelToken`)
- Modify: `packages/core/src/color/spaces/{srgb,hsl,hwb,lab,lch,oklab,oklch,colorFn}.ts`

**Interfaces:**
- Consumes: `parseHue` from `./components`; `SpaceId` from `./types`.
- Produces:

```ts
export interface NotationChannel {
  name: string;
  toNative: (css: number) => number;
  fromNative: (native: number) => number;
  percentRef: number;
  angle?: boolean;
}
export interface NotationDef {
  space: SpaceId;
  channels: [NotationChannel, NotationChannel, NotationChannel];
}
export const NOTATIONS: Readonly<Record<string, NotationDef>>;
export function parseChannelToken(token: string, ch: NotationChannel): number;
```

**This is the riskiest task in the plan.** It refactors eight working parsers onto shared machinery. The payoff is that Task 5's plugin cannot drift from core's unit conversions, because there is only one copy. The existing parse suite is the guard.

**The unit algebra, derived from the current parsers.** Every existing channel helper reduces to the same shape: resolve the token to a CSS-unit number (percent scaled by that channel's reference), then map to native. Verified against each current implementation:

| notation | channel | `percentRef` | `toNative` | current code it replaces |
| --- | --- | --- | --- | --- |
| `rgb` | `r`/`g`/`b` | 255 | `v / 255` | `srgb.ts` `channel()` |
| `hsl` | `h` | — (angle) | identity | `parseHue` |
| `hsl` | `s`/`l` | 100 | `v / 100` | `hsl.ts` `sl()` |
| `hwb` | `h` | — (angle) | identity | `parseHue` |
| `hwb` | `w`/`b` | 100 | `v / 100` | `hwb.ts` `wb()` |
| `lab` | `l` | 100 | identity | `lab.ts` `lightness()` |
| `lab` | `a`/`b` | 125 | identity | `lab.ts` `ab()` |
| `lch` | `l` | 100 | identity | `lch.ts` `lightness()` |
| `lch` | `c` | 150 | identity | `lch.ts` `chroma()` |
| `lch` | `h` | — (angle) | identity | `parseHue` |
| `oklab` | `l` | 1 | identity | `oklab.ts` `lightness()` |
| `oklab` | `a`/`b` | 0.4 | identity | `oklab.ts` `ab()` |
| `oklch` | `l` | 1 | identity | `oklch.ts` `lightness()` |
| `oklch` | `c` | 0.4 | identity | `oklch.ts` `chroma()` |
| `oklch` | `h` | — (angle) | identity | `parseHue` |
| `color` | `r`/`g`/`b` | 1 | identity | `colorFn.ts` `channel()` |

Worked check that the unified formula reproduces current behaviour:
- `rgb` `"50%"` → `0.5 × 255 = 127.5` → `/255 = 0.5`. Current: `parseFloat/100 = 0.5`. ✔
- `hsl` `"50"` → `50` → `/100 = 0.5`. Current `sl()`: `50/100 = 0.5`. ✔
- `lab` `"50%"` → `0.5 × 100 = 50` → identity `50`. Current: `parseFloat("50%") = 50`. ✔
- `oklch` `"50%"` chroma → `0.5 × 0.4 = 0.2`. Current: `0.5 × 0.4 = 0.2`. ✔

`color()` is not in `NOTATIONS` keyed by space — it uses one shared channel triple, since every `color()` space has identical `0–1` channels.

- [ ] **Step 1: Write the failing test**

Create `packages/core/test/color/notations.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { parseChannelToken } from "../../src/color/components";
import { NOTATIONS } from "../../src/color/notations";
import { tryParse } from "../../src/color/parse";

describe("NOTATIONS", () => {
  it("covers every CSS functional notation", () => {
    expect(Object.keys(NOTATIONS).sort()).toEqual(
      ["color", "hsl", "hwb", "lab", "lch", "oklab", "oklch", "rgb"].sort(),
    );
  });

  it("gives each notation three named channels", () => {
    for (const [name, def] of Object.entries(NOTATIONS)) {
      expect(def.channels).toHaveLength(3);
      for (const ch of def.channels) {
        expect(typeof ch.name).toBe("string");
        expect(ch.name.length).toBeGreaterThan(0);
        expect(Number.isFinite(ch.percentRef)).toBe(true);
      }
      expect(def.space).toBeTruthy();
      expect(name).toBeTruthy();
    }
  });

  it("round-trips native <-> css units for every channel", () => {
    for (const def of Object.values(NOTATIONS)) {
      for (const ch of def.channels) {
        for (const css of [0, 0.25, 1, 42]) {
          expect(ch.fromNative(ch.toNative(css))).toBeCloseTo(css, 9);
        }
      }
    }
  });

  it("resolves tokens to the same native values the parsers produce", () => {
    const rgbR = NOTATIONS.rgb!.channels[0]!;
    expect(parseChannelToken("255", rgbR)).toBeCloseTo(1, 9);
    expect(parseChannelToken("50%", rgbR)).toBeCloseTo(0.5, 9);
    expect(parseChannelToken("none", rgbR)).toBe(0);

    const hslS = NOTATIONS.hsl!.channels[1]!;
    expect(parseChannelToken("50", hslS)).toBeCloseTo(0.5, 9);
    expect(parseChannelToken("50%", hslS)).toBeCloseTo(0.5, 9);

    const labA = NOTATIONS.lab!.channels[1]!;
    expect(parseChannelToken("50%", labA)).toBeCloseTo(62.5, 9);

    const oklchC = NOTATIONS.oklch!.channels[1]!;
    expect(parseChannelToken("50%", oklchC)).toBeCloseTo(0.2, 9);

    const hslH = NOTATIONS.hsl!.channels[0]!;
    expect(parseChannelToken("0.5turn", hslH)).toBeCloseTo(180, 9);
    expect(parseChannelToken("200grad", hslH)).toBeCloseTo(180, 9);
  });

  it("agrees with the real parsers end to end", () => {
    // If the refactor changed any unit, one of these shifts.
    expect(tryParse("rgb(255 0 0)")?.coords).toEqual([1, 0, 0]);
    expect(tryParse("hsl(120 50% 50%)")?.coords[1]).toBeCloseTo(0.5, 9);
    expect(tryParse("lab(50% 50% 0)")?.coords[1]).toBeCloseTo(62.5, 9);
    expect(tryParse("oklch(50% 50% 180)")?.coords[1]).toBeCloseTo(0.2, 9);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun test packages/core/test/color/notations.test.ts
```

Expected: FAIL — `Cannot find module './notations'` / `parseChannelToken` is not exported.

- [ ] **Step 3: Add the shared token resolver**

In `packages/core/src/color/components.ts`, append:

```ts
import type { NotationChannel } from "./notations";

/**
 * Resolve a channel token to its native storage value, using the channel's
 * percent reference and unit mapping. `none` -> 0; angles go through
 * {@link parseHue}; `%` scales by `percentRef`.
 */
export function parseChannelToken(token: string, ch: NotationChannel): number {
  if (token === "none") return 0;
  if (ch.angle) return parseHue(token);
  const css = token.endsWith("%")
    ? (Number.parseFloat(token) / 100) * ch.percentRef
    : Number.parseFloat(token);
  return ch.toNative(css);
}
```

`notations.ts` imports nothing from `components.ts`, so this direction of dependency is acyclic.

- [ ] **Step 4: Create the table**

Create `packages/core/src/color/notations.ts`:

```ts
/**
 * The notation table: for every CSS functional color notation, the space it
 * denotes and its three channels' unit metadata.
 *
 * This is the single source of truth for CSS-unit <-> native-unit conversion.
 * Both the built-in parsers and out-of-package plugins (e.g. relative-color
 * support) read it, so the two cannot drift — a drift here would produce
 * plausible-but-wrong colors that no type checker catches.
 */

import type { SpaceId } from "./types";

/** One channel's unit metadata within a notation. */
export interface NotationChannel {
  /** Keyword as written in CSS, e.g. "r", "h", "l". */
  name: string;
  /** CSS-unit value -> native storage value. */
  toNative: (css: number) => number;
  /** Native storage value -> CSS-unit value. */
  fromNative: (native: number) => number;
  /** What `100%` means for this channel, in CSS units. */
  percentRef: number;
  /** True for hue channels, which accept deg/grad/rad/turn. */
  angle?: boolean;
}

/** A notation: the space it denotes plus its three channels. */
export interface NotationDef {
  space: SpaceId;
  channels: [NotationChannel, NotationChannel, NotationChannel];
}

const identity = (n: number): number => n;

/** A channel whose CSS and native units coincide. */
const plain = (name: string, percentRef: number): NotationChannel => ({
  name,
  toNative: identity,
  fromNative: identity,
  percentRef,
});

/** A channel stored as `0..1` but written in `0..scale`. */
const scaled = (name: string, scale: number): NotationChannel => ({
  name,
  toNative: (css) => css / scale,
  fromNative: (native) => native * scale,
  percentRef: scale,
});

/** A hue channel: degrees in, degrees stored. */
const hue = (name = "h"): NotationChannel => ({
  name,
  toNative: identity,
  fromNative: identity,
  percentRef: 360,
  angle: true,
});

export const NOTATIONS: Readonly<Record<string, NotationDef>> = {
  rgb: {
    space: "srgb",
    channels: [scaled("r", 255), scaled("g", 255), scaled("b", 255)],
  },
  hsl: {
    space: "hsl",
    channels: [hue(), scaled("s", 100), scaled("l", 100)],
  },
  hwb: {
    space: "hwb",
    channels: [hue(), scaled("w", 100), scaled("b", 100)],
  },
  lab: {
    space: "lab",
    channels: [plain("l", 100), plain("a", 125), plain("b", 125)],
  },
  lch: {
    space: "lch",
    channels: [plain("l", 100), plain("c", 150), hue()],
  },
  oklab: {
    space: "oklab",
    channels: [plain("l", 1), plain("a", 0.4), plain("b", 0.4)],
  },
  oklch: {
    space: "oklch",
    channels: [plain("l", 1), plain("c", 0.4), hue()],
  },
  // Every color() space shares the same 0..1 channel triple; `space` here is a
  // placeholder, since the real space comes from the keyword in the string.
  color: {
    space: "srgb",
    channels: [plain("r", 1), plain("g", 1), plain("b", 1)],
  },
};
```

- [ ] **Step 5: Refactor the parsers onto the table**

For each of the eight space modules, delete the local unit helper and use `parseChannelToken` with the matching `NOTATIONS` channel. Do them **one at a time**, running `bun test packages/core` after each — that way a mistake is attributable to one file.

`hsl.ts` becomes:

```ts
import { alphaSuffix, num, parseAlpha, parseChannelToken, parseFn } from "../components";
import { NOTATIONS } from "../notations";
// ... existing conversion imports unchanged

export function parseHsl(input: string): ColorObject | null {
  const c = parseFn(input, "hsla?");
  if (!c || c.args.length < 3) return null;
  const [h = "", s = "", l = "", a] = c.args;
  const ch = NOTATIONS.hsl!.channels;
  const coords: Coords = [
    parseChannelToken(h, ch[0]),
    parseChannelToken(s, ch[1]),
    parseChannelToken(l, ch[2]),
  ];
  const alpha = c.alpha ?? (a !== undefined ? parseAlpha(a) : 1);
  return { space: "hsl", coords, alpha };
}
```

Delete the now-unused local `sl` constant. Apply the same shape to `srgb.ts` (`parseRgb`, dropping local `channel`), `hwb.ts` (dropping `wb`), `lab.ts` (dropping `lightness` and `ab`), `lch.ts` (dropping `lightness` and `chroma`), `oklab.ts`, and `oklch.ts`.

`colorFn.ts` keeps its keyword lookup and uses the shared triple:

```ts
export function parseColorFn(input: string): ColorObject | null {
  const c = parseFn(input, "color");
  if (!c || c.args.length < 4) return null;
  const [keyword = "", x = "", y = "", z = "", a] = c.args;
  const space = COLOR_FN_SPACES[keyword.toLowerCase()];
  if (!space) return null;
  const ch = NOTATIONS.color!.channels;
  const coords: Coords = [
    parseChannelToken(x, ch[0]),
    parseChannelToken(y, ch[1]),
    parseChannelToken(z, ch[2]),
  ];
  const alpha = c.alpha ?? (a !== undefined ? parseAlpha(a) : 1);
  return { space, coords, alpha };
}
```

**Serialisers are not touched in this task.** They have their own rounding precision per notation (`num(l, 5)` for Oklab/Oklch vs `num(l)` elsewhere), and folding that in would risk changing output strings. Leave them exactly as they are.

- [ ] **Step 6: Run both suites**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun test packages/core/test/color/notations.test.ts && bun test packages/core
```

Expected: new test PASSES; full core suite PASSES with **no assertion edits**. If an existing assertion fails, a unit in the table is wrong — consult the derivation table in this task and fix `notations.ts`, not the test.

- [ ] **Step 7: Confirm no dead code left behind**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor
grep -n 'const sl = \|const wb = \|const ab = \|const chroma = \|const lightness = \|const channel = ' packages/core/src/color/spaces/*.ts || echo "CLEAN"
```

Expected: `CLEAN`.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/color packages/core/test/color/notations.test.ts
git commit -m "refactor(core): add NOTATIONS table as the single source of unit truth

Each parser embedded its own CSS-unit -> native-unit conversion. Plugins
needing the same mapping would have to duplicate it, and drift would produce
plausible-but-wrong colors. Extract one table and route every built-in parser
through it. Serialisers are untouched — their rounding precision is
notation-specific.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Parser registry in core

**Files:**
- Modify: `packages/core/src/color/parse.ts`
- Modify: `packages/core/src/index.ts`
- Create: `packages/core/test/color/registry.test.ts`

**Interfaces:**
- Produces:

```ts
export type ColorParser = (input: string) => ColorObject | null;
export function registerParser(parser: ColorParser): () => void;
```

Registered parsers are consulted **after** all built-ins, so a plugin can never shadow or slow down a standard notation. Dispose is idempotent.

- [ ] **Step 1: Write the failing test**

Create `packages/core/test/color/registry.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { registerParser, tryParse } from "../../src/color/parse";
import type { ColorObject } from "../../src/color/types";

const magenta = (input: string): ColorObject | null =>
  input === "test-magenta" ? { space: "srgb", coords: [1, 0, 1], alpha: 1 } : null;

describe("registerParser", () => {
  it("does not parse an unknown notation before registration", () => {
    expect(tryParse("test-magenta")).toBeNull();
  });

  it("parses it after registration, and stops after dispose", () => {
    const dispose = registerParser(magenta);
    expect(tryParse("test-magenta")?.coords).toEqual([1, 0, 1]);
    dispose();
    expect(tryParse("test-magenta")).toBeNull();
  });

  it("treats a second dispose as a no-op", () => {
    const dispose = registerParser(magenta);
    dispose();
    expect(() => dispose()).not.toThrow();
    expect(tryParse("test-magenta")).toBeNull();
  });

  it("never lets a registered parser shadow a built-in", () => {
    // This parser would claim every input; built-ins must still win.
    const dispose = registerParser(() => ({ space: "srgb", coords: [0, 1, 0], alpha: 1 }));
    expect(tryParse("#ff0000")?.coords).toEqual([1, 0, 0]);
    expect(tryParse("red")?.coords).toEqual([1, 0, 0]);
    dispose();
  });

  it("consults multiple parsers in registration order", () => {
    const first = registerParser((i) => (i === "dup" ? { space: "srgb", coords: [1, 0, 0], alpha: 1 } : null));
    const second = registerParser((i) => (i === "dup" ? { space: "srgb", coords: [0, 0, 1], alpha: 1 } : null));
    expect(tryParse("dup")?.coords).toEqual([1, 0, 0]);
    first();
    expect(tryParse("dup")?.coords).toEqual([0, 0, 1]);
    second();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun test packages/core/test/color/registry.test.ts
```

Expected: FAIL — `registerParser` is not exported.

- [ ] **Step 3: Implement the registry**

In `packages/core/src/color/parse.ts`, rename the local `Parser` type to an exported one and add the registry:

```ts
/** A parser: returns a ColorObject, or null when the input isn't its notation. */
export type ColorParser = (input: string) => ColorObject | null;

// Ordered by cheapest / most common first. Functional notations are mutually
// exclusive by name, so order among them doesn't matter for correctness.
const PARSERS: ColorParser[] = [
  parseHex,
  parseNamed,
  parseRgb,
  parseHsl,
  parseHwb,
  parseColorFn,
  parseOklch,
  parseOklab,
  parseLch,
  parseLab,
];

/** Parsers contributed by plugins, consulted after every built-in. */
const registered: ColorParser[] = [];

/**
 * Register an additional parser. Registered parsers run *after* all built-ins,
 * so a plugin can neither shadow nor slow down a standard notation. Returns a
 * dispose function; calling it more than once is a no-op.
 */
export function registerParser(parser: ColorParser): () => void {
  registered.push(parser);
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    const i = registered.indexOf(parser);
    if (i >= 0) registered.splice(i, 1);
  };
}

/** Parse a CSS color string, or `null` if no notation matches. */
export function tryParse(input: string): ColorObject | null {
  for (const p of PARSERS) {
    const result = p(input);
    if (result) return result;
  }
  for (const p of registered) {
    const result = p(input);
    if (result) return result;
  }
  return null;
}
```

Note the dispose closure captures `parser` by reference and looks the index up at dispose time, so removing one parser does not invalidate another's handle.

- [ ] **Step 4: Export the new surface**

In `packages/core/src/index.ts`, extend the parse export line and add the notation table from Task 2:

```ts
export { parse, tryParse, registerParser, type ColorParser } from "./color/parse";
export { NOTATIONS, type NotationChannel, type NotationDef } from "./color/notations";
export { parseChannelToken } from "./color/components";
```

- [ ] **Step 5: Run the tests**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun test packages/core
```

Expected: PASS, including the 5 new registry tests.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src packages/core/test/color/registry.test.ts
git commit -m "feat(core): add a parser registry for plugins

registerParser() appends a parser consulted after every built-in, and returns
an idempotent dispose handle. Built-ins always win, so a plugin cannot shadow
a standard notation.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: `@urcolor/relative` scaffold and the math evaluator

**Files:**
- Create: `packages/relative/package.json`, `tsconfig.build.json`, `vite.config.ts`
- Create: `packages/relative/src/math.ts`
- Create: `packages/relative/test/math.test.ts`

**Interfaces:**
- Produces:

```ts
export interface MathValue { value: number; percent: boolean }
export type MathScope = Record<string, MathValue>;
export function evaluateMath(input: string, scope: MathScope): MathValue | null;
```

The evaluator is colour-agnostic and independently testable. Task 5 consumes it.

- [ ] **Step 1: Scaffold the package**

Create `packages/relative/package.json`:

```json
{
  "name": "@urcolor/relative",
  "version": "0.0.4",
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
  "keywords": ["color", "css", "relative-color", "color-mix", "calc"],
  "author": { "name": "GrandMagus", "url": "https://github.com/GrandMagus02" },
  "homepage": "https://urcolor.vercel.app/",
  "repository": {
    "type": "git",
    "url": "https://github.com/ur-color/urcolor",
    "directory": "packages/relative"
  },
  "bugs": { "url": "https://github.com/ur-color/urcolor/issues" },
  "dependencies": {
    "@urcolor/core": "workspace:*"
  }
}
```

Create `packages/relative/tsconfig.build.json`, mirroring core's:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "declaration": true,
    "emitDeclarationOnly": true,
    "outDir": "dist",
    "paths": {}
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

The root `package.json` already globs `packages/*`, so no workspace edit is needed. Install:

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun install
```

- [ ] **Step 2: Write the failing test**

Create `packages/relative/test/math.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { evaluateMath, type MathScope } from "../src/math";

const n = (value: number): { value: number; percent: boolean } => ({ value, percent: false });
const scope: MathScope = { h: n(0), s: n(100), l: n(50), alpha: n(1) };

const val = (input: string): number | null => evaluateMath(input, scope)?.value ?? null;

describe("evaluateMath — literals and keywords", () => {
  it("reads bare numbers", () => {
    expect(val("42")).toBe(42);
    expect(val("-1.5")).toBeCloseTo(-1.5, 9);
    expect(val("+3")).toBe(3);
  });

  it("reads channel keywords from scope", () => {
    expect(val("l")).toBe(50);
    expect(val("alpha")).toBe(1);
  });

  it("treats none as 0", () => {
    expect(val("none")).toBe(0);
  });

  it("normalises angle units to degrees", () => {
    expect(val("0.5turn")).toBeCloseTo(180, 9);
    expect(val("200grad")).toBeCloseTo(180, 9);
    expect(val("90deg")).toBeCloseTo(90, 9);
  });

  it("marks percentages", () => {
    const r = evaluateMath("50%", scope);
    expect(r).toEqual({ value: 50, percent: true });
  });

  it("returns null for an unknown identifier", () => {
    expect(evaluateMath("nope", scope)).toBeNull();
  });
});

describe("evaluateMath — arithmetic", () => {
  it("applies * / before + -", () => {
    expect(val("calc(2 + 3 * 4)")).toBe(14);
    expect(val("calc(10 - 6 / 2)")).toBe(7);
  });

  it("honours parentheses", () => {
    expect(val("calc((2 + 3) * 4)")).toBe(20);
  });

  it("computes with channel keywords", () => {
    expect(val("calc(h + 180)")).toBe(180);
    expect(val("calc(l * 2)")).toBe(100);
  });

  it("handles unary signs inside expressions", () => {
    expect(val("calc(-l + 100)")).toBe(50);
  });

  it("returns null on division by zero", () => {
    expect(evaluateMath("calc(1 / 0)", scope)).toBeNull();
    expect(evaluateMath("calc(1 / h)", scope)).toBeNull();
  });

  it("returns null on unbalanced parentheses", () => {
    expect(evaluateMath("calc(1 + 2", scope)).toBeNull();
    expect(evaluateMath("calc(1 + 2))", scope)).toBeNull();
  });
});

describe("evaluateMath — functions", () => {
  it("evaluates clamp, min and max", () => {
    expect(val("clamp(0, 5, 10)")).toBe(5);
    expect(val("clamp(0, -5, 10)")).toBe(0);
    expect(val("clamp(0, 50, 10)")).toBe(10);
    expect(val("min(3, 1, 2)")).toBe(1);
    expect(val("max(3, 1, 2)")).toBe(3);
  });

  it("nests functions arbitrarily", () => {
    expect(val("clamp(0, calc(l * 3), min(100, 120))")).toBe(100);
    expect(val("calc(max(1, 2) * min(3, 4))")).toBe(6);
  });

  it("returns null when clamp has the wrong argument count", () => {
    expect(evaluateMath("clamp(0, 5)", scope)).toBeNull();
    expect(evaluateMath("clamp(0, 5, 10, 15)", scope)).toBeNull();
  });
});

describe("evaluateMath — number/percentage algebra", () => {
  it("adds like types", () => {
    expect(evaluateMath("calc(10% + 20%)", scope)).toEqual({ value: 30, percent: true });
    expect(evaluateMath("calc(10 + 20)", scope)).toEqual({ value: 30, percent: false });
  });

  it("rejects mixing number and percentage under + -", () => {
    expect(evaluateMath("calc(10 + 20%)", scope)).toBeNull();
    expect(evaluateMath("calc(20% - 10)", scope)).toBeNull();
  });

  it("multiplies a percentage by a number", () => {
    expect(evaluateMath("calc(50% * 2)", scope)).toEqual({ value: 100, percent: true });
    expect(evaluateMath("calc(2 * 50%)", scope)).toEqual({ value: 100, percent: true });
  });

  it("divides a percentage by a number", () => {
    expect(evaluateMath("calc(50% / 2)", scope)).toEqual({ value: 25, percent: true });
  });

  it("rejects dividing by a percentage", () => {
    expect(evaluateMath("calc(10 / 50%)", scope)).toBeNull();
  });

  it("rejects mixed types in clamp/min/max", () => {
    expect(evaluateMath("min(10, 20%)", scope)).toBeNull();
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun test packages/relative/test/math.test.ts
```

Expected: FAIL — `Cannot find module "../src/math"`.

- [ ] **Step 4: Implement the evaluator**

Create `packages/relative/src/math.ts`. Structure it as a tokeniser plus a recursive-descent parser over the grammar in the spec. Requirements the tests above pin down:

- **Tokens:** numbers (with optional sign handled by the parser, not the tokeniser), percentages (`50%`), angle dimensions (`deg`/`grad`/`rad`/`turn`, normalised to degrees at tokenisation), identifiers, the operators `+ - * /`, parentheses, and commas.
- **Grammar:** `expr := term (("+"|"-") term)*`, `term := factor (("*"|"/") factor)*`, `factor := "(" expr ")" | fn | literal | identifier | "none" | ("+"|"-") factor`.
- **Functions:** `calc(expr)`, `clamp(expr, expr, expr)` (exactly three), `min`/`max` (one or more). Function names are case-insensitive.
- **Type algebra:** implement exactly the table in the spec. `+`/`-` require matching `percent` flags; `*` allows at most one percent operand and propagates it; `/` requires a non-percent divisor and propagates the dividend's flag; `clamp`/`min`/`max` require all arguments to agree.
- **Bare input:** a token with no surrounding `calc()` — `"50%"`, `"l"`, `"none"`, `"180deg"` — must evaluate as a single `factor`. The whole input must be consumed; trailing junk is `null`.
- **Every error path returns `null`.** Never throw, never return `NaN` or `Infinity`. Guard division by zero explicitly, and reject a non-finite result at the end.

Keep it under ~200 lines. Do not add a dependency.

- [ ] **Step 5: Run the tests**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun test packages/relative/test/math.test.ts
```

Expected: PASS, all tests.

- [ ] **Step 6: Commit**

```bash
git add packages/relative bun.lock
git commit -m "feat(relative): scaffold @urcolor/relative with a CSS math evaluator

Recursive-descent evaluator for calc/clamp/min/max with CSS number-vs-
percentage type algebra. Colour-agnostic and independently tested; the
relative parser consumes it next.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: The relative parser

**Files:**
- Create: `packages/relative/src/scope.ts`, `src/parse.ts`, `src/index.ts`
- Create: `packages/relative/test/relative.test.ts`

**Interfaces:**
- Consumes: from `@urcolor/core` — `tryParse`, `convert`, `registerParser`, `NOTATIONS`, `parseChannelToken`, types `ColorObject`, `Coords`, `SpaceId`, `NotationDef`; from `./math` — `evaluateMath`, `MathScope`, `MathValue`.
- Produces:

```ts
export function registerRelativeColor(): () => void;
```

- [ ] **Step 1: Write the failing test**

Create `packages/relative/test/relative.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Color, tryParse } from "@urcolor/core";
import { registerRelativeColor } from "../src/index";

let dispose: () => void;
beforeAll(() => { dispose = registerRelativeColor(); });
afterAll(() => { dispose(); });

/** Assert two colors match, comparing in the first one's space. */
const same = (a: string, b: string): void => {
  const x = tryParse(a);
  const y = tryParse(b);
  expect(x).not.toBeNull();
  expect(y).not.toBeNull();
  const yc = Color.from(y!).to(x!.space);
  expect(x!.coords[0]).toBeCloseTo(yc.coords[0], 4);
  expect(x!.coords[1]).toBeCloseTo(yc.coords[1], 4);
  expect(x!.coords[2]).toBeCloseTo(yc.coords[2], 4);
  expect(x!.alpha).toBeCloseTo(yc.alpha, 4);
};

describe("identity — every notation reproduces its origin", () => {
  it("rgb", () => same("rgb(from red r g b)", "red"));
  it("hsl", () => same("hsl(from red h s l)", "red"));
  it("hwb", () => same("hwb(from red h w b)", "red"));
  it("lab", () => same("lab(from red l a b)", "red"));
  it("lch", () => same("lch(from red l c h)", "red"));
  it("oklab", () => same("oklab(from red l a b)", "red"));
  it("oklch", () => same("oklch(from red l c h)", "red"));
  it("color", () => same("color(from red srgb r g b)", "red"));
});

describe("channel substitution and arithmetic", () => {
  it("substitutes a literal for a channel", () => {
    same("rgb(from red 0 g b)", "rgb(0 0 0)");
  });

  it("rotates hue with calc", () => {
    same("hsl(from red calc(h + 180) s l)", "hsl(180 100% 50%)");
  });

  it("scales lightness in oklch", () => {
    const c = tryParse("oklch(from red calc(l * 0.5) c h)");
    const base = tryParse("oklch(from red l c h)");
    expect(c!.coords[0]).toBeCloseTo(base!.coords[0] * 0.5, 6);
    expect(c!.coords[1]).toBeCloseTo(base!.coords[1], 6);
  });

  it("reads the origin in the target space, not sRGB", () => {
    // red's oklch lightness is ~0.628, nothing like its sRGB r of 1.
    const c = tryParse("oklch(from #ff0000 l c h)");
    expect(c!.coords[0]).toBeGreaterThan(0.5);
    expect(c!.coords[0]).toBeLessThan(0.75);
  });

  it("accepts percent-typed channels", () => {
    same("hsl(from red h 50% l)", "hsl(0 50% 50%)");
  });

  it("supports clamp and min/max", () => {
    same("hsl(from red h clamp(0%, 200%, 60%) l)", "hsl(0 60% 50%)");
  });
});

describe("alpha", () => {
  it("passes alpha through", () => {
    const c = tryParse("rgb(from rgb(255 0 0 / 40%) r g b / alpha)");
    expect(c!.alpha).toBeCloseTo(0.4, 4);
  });

  it("computes on alpha", () => {
    const c = tryParse("rgb(from rgb(255 0 0 / 40%) r g b / calc(alpha * 0.5))");
    expect(c!.alpha).toBeCloseTo(0.2, 4);
  });

  it("defaults alpha to the origin's when omitted", () => {
    const c = tryParse("rgb(from rgb(255 0 0 / 40%) r g b)");
    expect(c!.alpha).toBeCloseTo(0.4, 4);
  });

  it("handles an origin with its own alpha and nested parens", () => {
    const c = tryParse("rgb(from rgb(1 2 3 / 40%) r g b / 50%)");
    expect(c!.alpha).toBeCloseTo(0.5, 4);
    expect(c!.coords[0]).toBeCloseTo(1 / 255, 6);
  });
});

describe("failure modes all return null", () => {
  it("unparseable origin", () => expect(tryParse("rgb(from nonsense r g b)")).toBeNull());
  it("var() origin", () => expect(tryParse("rgb(from var(--x) r g b)")).toBeNull());
  it("currentcolor origin", () => expect(tryParse("rgb(from currentcolor r g b)")).toBeNull());
  it("unknown channel keyword", () => expect(tryParse("rgb(from red r g q)")).toBeNull());
  it("channel from another notation", () => expect(tryParse("rgb(from red r g l)")).toBeNull());
  it("too few channels", () => expect(tryParse("rgb(from red r g)")).toBeNull());
  it("type mismatch", () => expect(tryParse("hsl(from red h calc(s + 10) l)")).toBeNull());
  it("division by zero", () => expect(tryParse("rgb(from red calc(r / 0) g b)")).toBeNull());
  it("unknown color() space", () => expect(tryParse("color(from red nope r g b)")).toBeNull());
});

describe("absolute parsing is unaffected", () => {
  it("still parses ordinary notations", () => {
    expect(tryParse("rgb(255 0 0)")?.coords).toEqual([1, 0, 0]);
    expect(tryParse("#ff0000")?.coords).toEqual([1, 0, 0]);
    expect(tryParse("oklch(50% 0.1 180)")).not.toBeNull();
  });
});

describe("registration lifecycle", () => {
  // These manipulate the outer registration, so they restore it afterwards.
  it("stops parsing relative syntax once every registration is disposed", () => {
    dispose();
    expect(tryParse("rgb(from red r g b)")).toBeNull();
    dispose = registerRelativeColor();
    expect(tryParse("rgb(from red r g b)")).not.toBeNull();
  });

  it("treats a second dispose as a no-op and leaves other registrations alone", () => {
    const extra = registerRelativeColor();
    extra();
    expect(() => extra()).not.toThrow();
    // The outer registration survives the extra one's double dispose.
    expect(tryParse("rgb(from red r g b)")).not.toBeNull();
  });
});
```

Note `hsl(from red h calc(s + 10) l)` is a type mismatch: `s` resolves as a percent-typed channel and `10` is a number, which CSS forbids mixing.

- [ ] **Step 2: Run it to confirm it fails**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun test packages/relative/test/relative.test.ts
```

Expected: FAIL — `Cannot find module "../src/index"`.

- [ ] **Step 3: Implement `scope.ts`**

```ts
/**
 * Builds the variable scope a relative color's channel expressions see. The
 * origin is converted into the target notation's space first, then each native
 * coordinate is mapped back into CSS units via the notation's channel table —
 * so `oklch(from red l c h)` sees red's Oklch lightness, not its sRGB red.
 */

import { convert, type ColorObject, type NotationDef, type SpaceId } from "@urcolor/core";
import type { MathScope } from "./math";

export function buildScope(origin: ColorObject, def: NotationDef, space: SpaceId): MathScope {
  const c = convert(origin, space);
  const scope: MathScope = {
    alpha: { value: c.alpha, percent: false },
  };
  def.channels.forEach((ch, i) => {
    scope[ch.name] = { value: ch.fromNative(c.coords[i] as number), percent: false };
  });
  return scope;
}
```

Channel values enter scope as **numbers, not percentages** — `s` in `hsl(from red h s l)` is `100`, not `100%`. This is what makes `calc(s + 10)` a type error while `calc(s * 2)` is fine, matching the test above.

- [ ] **Step 4: Implement `parse.ts`**

The parser must:

1. Match `name(...)` case-insensitively for each of the eight notation names, and take the raw body.
2. Detect a leading `from` keyword (case-insensitive, whitespace-delimited). If absent, return `null` — the built-in absolute parser already handled it.
3. Split the body at the **first depth-0 `/`** to separate the alpha expression, using the same paren-depth scan as core's `topLevelSlash`. Everything before is the origin plus channels.
4. Extract the origin: scan forward from after `from`, accumulating characters and tracking paren depth, until reaching a depth-0 whitespace boundary that is *not* inside a function call. Because the origin may itself be a function (`rgb(1 2 3 / 40%)`) or a bare token (`red`, `#ff0000`), the rule is: if the next token opens a function, consume through its matching close paren; otherwise consume to the next whitespace.
5. `tryParse` the origin substring. `null` fails the whole parse. This is also what rejects `var(--x)` and `currentcolor`, since core parses neither.
6. Split the remainder into channel expressions. **Whitespace splitting is not enough** — `calc(h + 180)` contains spaces. Split on depth-0 whitespace only, so parenthesised expressions stay intact. Require exactly 3 (or 4 for `color()`, whose first token is the space keyword).
7. For `color()`, read and validate the space keyword before building the scope; an unknown keyword returns `null`.
8. Build the scope with `buildScope`, evaluate each channel expression with `evaluateMath`, and convert each result to native units: if the result is `percent`, first scale by that channel's `percentRef`, then apply `toNative`; otherwise apply `toNative` directly. A `null` from `evaluateMath` fails the parse.
9. Alpha: if an alpha expression is present, evaluate it in the same scope, treating a percent result as `/100`. If absent, inherit the **origin's** alpha (per CSS, and per the test above).
10. Reject a non-finite coordinate.

Export a single `relativeParser: ColorParser` that tries each notation name in turn.

- [ ] **Step 5: Implement `index.ts`**

```ts
/**
 * `@urcolor/relative` — CSS Color 5 relative-color syntax for `@urcolor/core`.
 *
 * ```ts
 * import { Color } from "@urcolor/core";
 * import { registerRelativeColor } from "@urcolor/relative";
 *
 * registerRelativeColor();
 * Color.parse("oklch(from #3b82f6 calc(l * 0.8) c h)");
 * ```
 */

import { registerParser } from "@urcolor/core";
import { relativeParser } from "./parse";

/**
 * Teach `@urcolor/core`'s parser the relative-color syntax. Returns a dispose
 * function that removes it again; calling dispose twice is a no-op.
 */
export function registerRelativeColor(): () => void {
  return registerParser(relativeParser);
}

export { evaluateMath, type MathScope, type MathValue } from "./math";
```

- [ ] **Step 6: Run the tests**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun test packages/relative
```

Expected: PASS, all tests in both files. The eight identity tests are the load-bearing ones — a failure there means a unit in core's `NOTATIONS` disagrees with that notation's parser.

- [ ] **Step 7: Confirm core is unaffected and the package builds**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun test && bun run --cwd packages/relative build
```

Expected: full suite PASSES; build emits `packages/relative/dist/index.js` and `dist/index.d.ts` with no errors.

```bash
grep -rn '\.ts"' packages/relative/dist/*.d.ts || echo "CLEAN"
```

Expected: `CLEAN`.

- [ ] **Step 8: Commit**

```bash
git add packages/relative
git commit -m "feat(relative): implement CSS relative-color parsing

Parses 'from <color>' across all eight CSS notations, evaluating channel
expressions against a scope built from the origin converted into the target
space. Registers through core's parser registry; call registerRelativeColor()
to enable.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Docs, changelogs, and the full verification sweep

**Files:**
- Create: `packages/relative/README.md`, `packages/relative/CHANGELOG.md`
- Create: `docs/guide/relative-colors.md`
- Modify: `docs/.vitepress/config.ts`, `docs/guide/index.md`, `README.md`
- Modify: `packages/core/CHANGELOG.md`
- Modify: root `package.json` (build script)

- [ ] **Step 1: Add the package to the build pipeline**

The root `build` script currently chains core, vue, and react. `@urcolor/relative` must build too, after core:

```json
"build": "bun run --cwd packages/core build && bun run --cwd packages/relative build && bun run --cwd packages/vue build && bun run --cwd packages/react build",
```

- [ ] **Step 2: Close the carried-forward core changelog gap**

A prior review found `packages/core/CHANGELOG.md`'s migration table omits the two most consumer-relevant behavioural changes from the vendoring work. Add them to the existing `## Unreleased` section's Changed list:

```md
- **BREAKING:** `Color.from()`, `Color#with()`, and `Color#get()` now **throw**
  where the previous library returned `null`/`undefined`. `Color.from()` throws
  on unparseable input — use `Color.parse()`, which returns `Color | null`, when
  a failure is a value rather than an error. `with()` throws `RangeError` for a
  channel absent from the target space and `TypeError` for a non-numeric channel
  value; `get()` throws `RangeError` for an unknown channel.
- **BREAKING:** `gamutMap()` changed in kind, not just in precision. It reduces
  Oklch chroma per CSS Color 4 and returns an Oklch color, where the previous
  implementation clipped channels in the destination space. Out-of-gamut colors
  will map to visibly different results.
```

Then add a new entry for the registry work:

```md
### Added

- `registerParser(parser)` — register an additional color parser, consulted
  after all built-ins. Returns an idempotent dispose function. This is the
  extension point `@urcolor/relative` uses.
- `NOTATIONS` — the CSS-unit metadata for every functional notation, exported so
  plugins share core's unit conversions rather than duplicating them.
```

- [ ] **Step 3: Write the package README**

Create `packages/relative/README.md` covering: what relative colors are, the one-line install and `registerRelativeColor()` call, a table of the eight supported notations, the supported math (`calc`, `clamp`, `min`, `max`, nesting, precedence), and — stated plainly — the non-goals: `var()`, `currentcolor`, and `attr()` origins are parse failures because the library has no stylesheet or cascade, and `none` collapses to `0` rather than becoming a missing component.

- [ ] **Step 4: Write the guide page**

Create `docs/guide/relative-colors.md`. Follow the existing guide conventions in `CLAUDE.md`. Cover: enabling the plugin, the `from` syntax, channel keywords per notation (reuse the units table from the spec), arithmetic examples, and the failure modes. Register it in the `/guide/` sidebar section of `docs/.vitepress/config.ts` — `CLAUDE.md` requires every new page be added to the sidebar.

Also add `@urcolor/relative` to the package list in `docs/guide/index.md` and the root `README.md`.

- [ ] **Step 5: Create the package changelog**

Create `packages/relative/CHANGELOG.md` with an `## Unreleased` section describing the initial release: relative-color parsing across all eight notations, full `calc`/`clamp`/`min`/`max` support, and the explicit non-goals.

- [ ] **Step 6: Run every verification gate**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor && bun test
```
Expected: all tests pass across core, relative, vue, and react.

```bash
bun run build
```
Expected: all four packages build clean.

```bash
bun run docs:build
```
Expected: exit 0.

```bash
bunx vue-tsc --noEmit 2>&1 | grep -E "error TS" | grep -v "geometry.test.ts"
```
Expected: no output. The two pre-existing `geometry.test.ts` errors are known and out of scope; **nothing new** may appear, especially from `packages/relative`.

- [ ] **Step 7: Confirm the dependency boundary held**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor
grep -A3 '"dependencies"' packages/core/package.json
grep -A3 '"dependencies"' packages/relative/package.json
```

Expected: core has `{}`; relative has only `@urcolor/core`. If anything else appears, a dependency crept in — remove it.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "docs(relative): document relative-color support

Adds the package README, a guide page wired into the sidebar, and changelog
entries. Also closes a gap in core's migration table, which omitted that
Color.from/with/get now throw where the old library returned null, and that
gamutMap changed in kind rather than only in precision.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Verification Summary

Complete when all hold:

1. `bun test` — green across all four packages.
2. `bun run build` — all four packages build.
3. `bun run docs:build` — exits 0.
4. `bunx vue-tsc --noEmit` — no new errors beyond the 2 known `geometry.test.ts` ones.
5. `packages/core/package.json` has `"dependencies": {}`; `packages/relative` depends only on `@urcolor/core`.
6. The existing core test suite passed throughout **without a single assertion edit**.
7. All eight per-notation identity tests pass — the guard against silent unit drift.

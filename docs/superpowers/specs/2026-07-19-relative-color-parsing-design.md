# CSS relative color parsing — `@urcolor/relative`

**Date:** 2026-07-19
**Status:** Draft — awaiting approval
**Depends on:** `docs/superpowers/specs/2026-07-19-vendor-color-lib-into-core-design.md` (the vendored library this extends)

## Goal

Support the CSS Color 5 relative-color syntax, as an opt-in plugin over `@urcolor/core`:

```css
rgb(from red r g b)
hsl(from red calc(h + 180) s l)
oklch(from #ff0000 calc(l * 0.8) c h)
lab(from red l a calc(b + 20))
color(from red display-p3 r g b / 50%)
```

Reference: <https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Colors/Using_relative_colors>

## Decisions

- **Ships as a separate package, `@urcolor/relative`**, depending on `@urcolor/core`. Costs nothing to consumers who never import it.
- **Activated explicitly** via `registerRelativeColor()`. No side-effect import, no import-order hazard, tree-shakeable.
- **Core gains a parser-extension point:** `registerParser(fn)` returning a dispose function.
- **Core gains a public notation table** so the plugin never duplicates unit conversions (see "The drift problem" below — this is the crux of the design).
- **All notations accept `from`:** `rgb()`, `hsl()`, `hwb()`, `lab()`, `lch()`, `oklab()`, `oklch()`, `color()`.
- **Full CSS math grammar:** `calc()`, `clamp()`, `min()`, `max()`, nested arbitrarily, correct `* /` over `+ -` precedence, parenthesised sub-expressions.
- **Zero runtime dependencies** in both packages.

## Non-goals

- `var()` substitution. A relative color may name `var(--brand)` as its origin, but this library has no stylesheet, cascade, or custom-property registry. `var()` as origin is a **parse failure**, not a silent default — callers resolve custom properties first.
- CSS-wide keywords (`currentcolor`, `inherit`) as origin, for the same reason.
- `attr()`, `env()`, and other substitution functions.
- Relative-color **serialisation**. Parsing resolves to an absolute `ColorObject`, so `serialize()` is unchanged — a parsed relative color round-trips as its computed absolute form, which is what browsers do at computed-value time.

## Usage

```ts
import { Color } from "@urcolor/core";
import { registerRelativeColor } from "@urcolor/relative";

registerRelativeColor();

Color.parse("oklch(from #3b82f6 calc(l * 0.8) c h)");
```

## Part 1 — changes to `@urcolor/core`

### 1a. Parser registry

`parse.ts` currently holds a fixed `PARSERS` array consulted in order. It gains a registry:

```ts
/** A parser: returns a ColorObject, or null when the input isn't its notation. */
export type ColorParser = (input: string) => ColorObject | null;

/**
 * Register an additional parser. Registered parsers are consulted *after* all
 * built-ins, so a plugin can never shadow or slow down standard notations.
 * Returns a dispose function that removes it again.
 */
export function registerParser(parser: ColorParser): () => void;
```

`tryParse` walks built-ins first, then registered parsers in registration order. Ordering matters and is deliberate: relative colors are a strict superset syntactically (`rgb(from …)` cannot be mistaken for an absolute `rgb()`), so built-ins-first costs nothing and guarantees the plugin cannot regress core behaviour.

Dispose is idempotent — calling it twice is a no-op, not an error — so test teardown is safe.

### 1b. The notation table — and the drift problem

Each notation exposes channel keywords in **CSS notation units**, which are often *not* the library's internal storage units:

| notation | keywords | CSS units in expressions | stored internally as |
| --- | --- | --- | --- |
| `rgb()` | `r` `g` `b` | `0–255` (percent ref 255) | `0–1` |
| `hsl()` | `h` `s` `l` | `h` deg; `s`/`l` `0–100` | `h` deg; `s`/`l` `0–1` |
| `hwb()` | `h` `w` `b` | `h` deg; `w`/`b` `0–100` | `h` deg; `w`/`b` `0–1` |
| `lab()` | `l` `a` `b` | `l` `0–100`; `a`/`b` `−125–125` | same |
| `lch()` | `l` `c` `h` | `l` `0–100`; `c` `0–150`; `h` deg | same |
| `oklab()` | `l` `a` `b` | `l` `0–1`; `a`/`b` `−0.4–0.4` | same |
| `oklch()` | `l` `c` `h` | `l` `0–1`; `c` `0–0.4`; `h` deg | same |
| `color()` | `r` `g` `b` | `0–1` | same |

`alpha` is `0–1` in every notation, percent reference `1`.

So `rgb(from red r g b)` sees `r = 255`, while `oklch(from red l c h)` sees `l ≈ 0.628`.

**The drift problem.** These conversions currently live inline inside each `parse*`/`serialize*` function in `packages/core/src/color/spaces/*.ts` — e.g. `hsl.ts`'s local `sl()` divides by 100, `srgb.ts`'s `channel()` divides by 255. If the plugin reimplements them, the two copies will drift, and drift here produces *plausible but wrong colours* that no type checker catches.

The fix is to make one copy authoritative. Core exports a notation descriptor table, and **core's own parsers are refactored to consume it**, so plugin and built-ins are driven by the same numbers by construction:

```ts
export interface NotationChannel {
  /** Keyword as written in CSS, e.g. "r", "h", "l". */
  name: string;
  /** CSS-unit value -> native storage value. */
  toNative: (css: number) => number;
  /** Native storage value -> CSS-unit value. */
  fromNative: (native: number) => number;
  /** What 100% means for this channel, in CSS units. */
  percentRef: number;
  /** True for hue channels, which accept deg/grad/rad/turn. */
  angle?: boolean;
}

export interface NotationDef {
  space: SpaceId;
  channels: [NotationChannel, NotationChannel, NotationChannel];
}

/** Every CSS notation this library parses, keyed by function name. */
export const NOTATIONS: Readonly<Record<string, NotationDef>>;
```

This refactor is the riskiest part of the work and is sequenced first, behind the existing parse test suite — which must stay green **with no assertion edits**. If a test needs changing, the refactor is wrong.

### 1c. Depth-aware alpha splitting (a latent bug)

`parseFn` in `components.ts` splits the alpha on the **first** `/` in the body, regardless of parenthesis depth:

```ts
const slash = body.indexOf("/");
```

That is already fragile and becomes wrong the moment an origin color carries its own alpha: `rgb(from rgb(1 2 3 / 40%) r g b)` mis-splits at the inner slash. Fix it to scan at depth 0. This touches the absolute path for every notation, so the existing parse tests are the guard.

## Part 2 — the `@urcolor/relative` package

```
packages/relative/
  package.json          name @urcolor/relative, deps: { "@urcolor/core": "workspace:*" }
  tsconfig.build.json
  src/
    math.ts             CSS math expression evaluator (colour-agnostic)
    scope.ts            builds the channel scope for a notation from an origin color
    parse.ts            the relative parser itself
    index.ts            registerRelativeColor()
  test/
    math.test.ts
    relative.test.ts
```

### `math.ts` — the expression evaluator

Self-contained, knows nothing about colour, independently testable:

```ts
/** A resolved value plus whether it was written as a percentage. */
export interface MathValue { value: number; percent: boolean }

/** Variables an expression may reference, e.g. { r: {value:255,percent:false} }. */
export type MathScope = Record<string, MathValue>;

/** Evaluate a CSS math expression or bare token. Null on any error. */
export function evaluateMath(input: string, scope: MathScope): MathValue | null;
```

Tokeniser plus recursive-descent parser over:

```
expr    := term (("+" | "-") term)*
term    := factor (("*" | "/") factor)*
factor  := "(" expr ")"
         | fn
         | number | percentage | dimension   // deg | grad | rad | turn
         | identifier                        // channel keyword, from scope
         | "none"                            // -> 0
         | ("+" | "-") factor                // unary sign
fn      := "calc" "(" expr ")"
         | "clamp" "(" expr "," expr "," expr ")"
         | ("min" | "max") "(" expr ("," expr)* ")"
```

Nesting is unrestricted — `calc()` inside `clamp()` inside `min()`, and bare `calc()` as any operand.

**Number/percentage algebra.** CSS treats `50%` and `0.5` as distinct types:

| operation | result |
| --- | --- |
| number `±` number | number |
| percent `±` percent | percent |
| number `±` percent | **error** — CSS forbids mixing |
| percent `*` number | percent |
| number `*` number | number |
| percent `/` number | percent |
| anything `/` percent | **error** |
| `clamp`/`min`/`max` | arguments must agree in type; result carries it |

Percentages carry their literal magnitude (`50%` → `{ value: 50, percent: true }`) and resolve to channel units only at the call site, via that channel's `percentRef`.

Angles normalise to degrees at tokenisation (`0.5turn` → `180`), matching the existing `parseHue`. Division by zero yields `null`, not `Infinity`.

### `scope.ts` and `parse.ts`

`scope.ts` takes an origin `ColorObject` and a `NotationDef`, converts the origin into the notation's space, and maps each native coordinate through `fromNative` to build the `MathScope`. Converting **before** extraction is what makes `oklch(from red l c h)` read red's Oklch coordinates rather than its sRGB ones.

`parse.ts` handles the `from` preamble. Splitting the body is the subtle part: the origin is itself an arbitrary colour notation and may contain commas, slashes, and nested parens. The splitter scans with a depth counter, takes the origin as the token run after `from` up to the depth-0 boundary, and recursively calls core's `tryParse` on it — a failed origin fails the whole parse. Each channel token is then evaluated against the scope and mapped back through `toNative`.

`color(from …)` differs: the space id follows the origin (`color(from red display-p3 r g b)`), so it is read first, then the scope is built.

## Error handling

Every failure returns `null`, so `tryParse` returns `null` and `parse` throws `SyntaxError` — identical to an unparseable absolute colour. No new error type. Null-returning cases: unparseable origin; `var()`/`currentcolor` as origin; unknown channel keyword; number/percentage type mismatch; division by zero; unbalanced parens; wrong argument count to `clamp`.

## `none` handling

CSS carries `none` through relative colors as a real missing component that participates in interpolation. This library has no missing-component representation — its existing absolute parsers already collapse `none` to `0`. Relative parsing does the same: `none` in a channel slot yields `0`, and a `none`-valued origin channel enters scope as `0`. This deliberately deviates from the spec and matches existing library behaviour; introducing missing components is a separate, much larger change.

## Testing

**`math.test.ts`** — the evaluator alone: precedence, nested functions, unary signs, angle units, every row of the number/percent algebra table, division by zero, malformed input.

**`relative.test.ts`** — per notation:
- **Identity, asserted for all eight notations:** `X(from C <its own channels>)` equals `C`. This is the load-bearing test — it fails loudly if any notation's units disagree.
- Channel substitution: `rgb(from red 0 g b)`.
- Arithmetic: `hsl(from red calc(h + 180) s l)` is red's complement.
- Cross-space origin: `oklch(from #ff0000 l c h)` reads Oklch coordinates.
- Alpha: `/ alpha` passthrough and `/ calc(alpha * 0.5)`.
- Origin carrying its own alpha and nested parens: `rgb(from rgb(1 2 3 / 40%) r g b / alpha)` — the depth-0 splitting case.
- Percent-typed channels: `hsl(from red h 50% l)`.
- Every failure mode above returns `null`.
- **Registration lifecycle:** relative syntax fails to parse before `registerRelativeColor()`, succeeds after, and fails again after dispose. Double-dispose is a no-op.

**Core regression:** the existing parse suite must stay green through the `NOTATIONS` refactor and the alpha-split fix, with **no assertion edits**.

## Risks

**The `NOTATIONS` refactor touches every built-in parser.** It is a behaviour-preserving change to code paths that currently work, undertaken to prevent future drift. Mitigation: sequence it first as its own reviewed step, guarded by the untouched existing test suite.

**Unit-table errors are silent** — a wrong reference range yields a plausible but wrong colour. Mitigation: the per-notation identity test.

**Global registry is process-wide mutable state.** Parallel test files sharing a process could interfere. Mitigation: the dispose handle, and registration-lifecycle tests that clean up after themselves.

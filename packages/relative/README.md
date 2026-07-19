# @urcolor/relative

CSS Color 5 [relative color syntax](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Colors/Using_relative_colors) for `@urcolor/core` — an opt-in plugin, not part of core.

```css
rgb(from red r g b)
hsl(from red calc(h + 180) s l)
oklch(from #ff0000 calc(l * 0.8) c h)
lab(from red l a calc(b + 20))
color(from red display-p3 r g b / 50%)
```

## Installation

```bash
bun add @urcolor/relative
```

Zero runtime dependencies beyond `@urcolor/core`, which is a peer of this package's only dependency.

## Usage

Relative-color parsing is **not** enabled by side effect. Call `registerRelativeColor()` once, wherever your app boots:

```ts
import { Color } from "@urcolor/core";
import { registerRelativeColor } from "@urcolor/relative";

registerRelativeColor();

Color.parse("oklch(from #3b82f6 calc(l * 0.8) c h)");
```

`registerRelativeColor()` returns an idempotent dispose function. Calling it removes the relative parser again; calling it twice is a no-op, which makes it safe to use in test teardown:

```ts
const dispose = registerRelativeColor();
// ...
dispose();
dispose(); // no-op, does not throw
```

Without calling `registerRelativeColor()`, `Color.parse()` and `Color.tryParse()` treat relative syntax as unparseable, exactly like any other unrecognised string.

## Supported notations

All eight of core's functional notations accept `from`, with channel keywords typed as CSS Color 5 specifies — every component keyword is a `<number>`, not a `<percentage>`, uniformly:

| notation | channel keywords |
| --- | --- |
| `rgb()` | `r` `g` `b` |
| `hsl()` | `h` `s` `l` |
| `hwb()` | `h` `w` `b` |
| `lab()` | `l` `a` `b` |
| `lch()` | `l` `c` `h` |
| `oklab()` | `l` `a` `b` |
| `oklch()` | `l` `c` `h` |
| `color()` | `r` `g` `b` for RGB-family spaces (`srgb`, `srgb-linear`, `display-p3`, `a98-rgb`, `prophoto-rgb`, `rec2020`); `x` `y` `z` for the XYZ spaces (`xyz`, `xyz-d50`, `xyz-d65`) |

Every notation also exposes `alpha` (`0–1`, percent reference `1`).

Because every keyword is a number, `calc(s + 10)` is valid — a saturated color's `s` is `100`, giving `110` — while `calc(s + 10%)` is **invalid**: CSS forbids mixing a number and a percentage under `+`/`-`. This surprises people coming from the intuition that `s`/`l`/`w`/`b` "feel like" percentages; the CSS Color 5 spec resolved [issue #7114](https://github.com/w3c/csswg-drafts/issues/7114) by typing them all as numbers instead.

## Supported math

The full CSS math grammar used by relative colors:

- `calc()`, `clamp()`, `min()`, `max()`
- Arbitrary nesting — `calc()` inside `clamp()` inside `min()`, and bare `calc()` as any operand
- Correct precedence — `*`/`/` bind tighter than `+`/`-`
- Parenthesised sub-expressions
- Angle units (`deg`, `grad`, `rad`, `turn`), normalised to degrees for hue channels
- The `none` keyword

```ts
Color.parse("hsl(from red calc(h + 180) s l)");        // complement
Color.parse("oklch(from red clamp(0.2, l, 0.8) c h)");  // clamp lightness
Color.parse("rgb(from red min(r, 128) g b)");
```

## Non-goals

These are **parse failures**, not silent defaults — `@urcolor/relative` has no stylesheet, cascade, or custom-property registry, so callers must resolve them before passing a string in:

- **`var()`** as the origin color. `rgb(from var(--brand) r g b)` returns `null`; resolve the custom property to a concrete color first.
- **`currentcolor`** and **`inherit`** as the origin color, for the same reason — there is no cascade to resolve them against.
- **`attr()`** (and other substitution functions) as the origin color.

Every failure — an unparseable origin, an unknown channel keyword, a number/percentage type mismatch, division by zero, unbalanced parentheses, or a wrong argument count to `clamp()` — returns `null` from `Color.parse()` / `Color.tryParse()`, and `Color.parse()` throws `SyntaxError`, exactly like any other unparseable colour. There is no new error type and no silent fallback.

`none` also deviates from the CSS spec deliberately: CSS Color 5 carries `none` through relative colors as a genuine missing component that participates in interpolation. `@urcolor/relative` has no missing-component representation — matching the rest of this library's absolute parsers, `none` in a channel slot (or in an origin channel) collapses to `0`.

## License

MIT

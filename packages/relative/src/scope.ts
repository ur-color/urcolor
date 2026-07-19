/**
 * Builds the variable scope a relative color's channel expressions see. The
 * origin is converted into the target notation's space first, then each native
 * coordinate is mapped back into CSS units via the notation's channel table —
 * so `oklch(from red l c h)` sees red's Oklch lightness, not its sRGB red.
 */

import { convert, type ColorObject, type NotationChannel, type NotationDef, type SpaceId } from "@urcolor/core";
import type { MathScope } from "./math";

/**
 * Whether a channel keyword resolves to a `<percentage>` rather than a
 * `<number>`. Per CSS Color 5 this is true only of `hsl()`'s `s`/`l` and
 * `hwb()`'s `w`/`b` — the channels CSS writes as `0%..100%` over the whole
 * native `0..1` range. Derived from the notation table rather than hard-coded
 * so it cannot drift: `rgb()` is excluded by its `255` reference, `lab()`'s
 * lightness by mapping `100%` to `100`, not `1`.
 *
 * The distinction is load-bearing for typing, not for value: it makes
 * `calc(s + 10)` the type error CSS says it is, while `calc(s * 2)` stays legal.
 */
function isPercentTyped(ch: NotationChannel): boolean {
  return ch.angle !== true && ch.percentRef === 100 && ch.toNative(ch.percentRef) === 1;
}

export function buildScope(origin: ColorObject, def: NotationDef, space: SpaceId): MathScope {
  const c = convert(origin, space);
  const scope: MathScope = {
    alpha: { value: c.alpha, percent: false },
  };
  def.channels.forEach((ch, i) => {
    scope[ch.name] = {
      value: ch.fromNative(c.coords[i] as number),
      percent: isPercentTyped(ch),
    };
  });
  return scope;
}

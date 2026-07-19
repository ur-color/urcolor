/**
 * Builds the variable scope a relative color's channel expressions see. The
 * origin is converted into the target notation's space first, then each native
 * coordinate is mapped back into CSS units via the notation's channel table —
 * so `oklch(from red l c h)` sees red's Oklch lightness, not its sRGB red.
 */

import { convert, type ColorObject, type NotationChannel, type SpaceId } from "@urcolor/core";
import type { MathScope } from "./math";

/**
 * Every component keyword is typed `<number>`, uniformly — CSS Color 5 says so
 * for all of them, including `hsl()`'s `s`/`l` and `hwb()`'s `w`/`b` ("s and l
 * are <number>s…", "w and b are <number>s…"). CSSWG issue #7114 asked for the
 * percentage treatment and was resolved the other way: `100` is *equivalent to*
 * `100%` in value, but the keyword's type is number. So `calc(s + 10)` is legal
 * number addition, while `calc(s + 10%)` is the type error.
 */
export function buildScope(
  origin: ColorObject,
  channels: readonly NotationChannel[],
  space: SpaceId,
): MathScope {
  const c = convert(origin, space);
  const scope: MathScope = {
    alpha: { value: c.alpha, percent: false },
  };
  channels.forEach((ch, i) => {
    scope[ch.name] = {
      value: ch.fromNative(c.coords[i] as number),
      percent: false,
    };
  });
  return scope;
}

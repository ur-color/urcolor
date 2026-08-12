/**
 * `@urcolor/ncs` — Natural Colour System notation for `@urcolor/core`.
 *
 * ```ts
 * import { Color } from "@urcolor/core";
 * import { registerNcsColor, toNcs } from "@urcolor/ncs";
 *
 * registerNcsColor();
 * Color.parse("S 1050-Y90R");
 * toNcs(Color.parse("#eb7f7a")!); // "S 1050-Y90R"
 * ```
 *
 * **This is an approximation.** NCS Colour AB holds the Natural Colour System
 * as proprietary and publishes no open notation-to-sRGB mapping, so the
 * conversion is fitted against published values rather than specified: mean
 * ΔE00 about 1.65 across 2,031 samples, and worst around 10 for very dark
 * near-neutrals. Anyone matching physical paint needs an official fan deck.
 */

import { registerParser, type Color } from "@urcolor/core";
import { fromOklch } from "./model";
import { formatNotation } from "./notation";
import { ncsParser } from "./parse";

/**
 * Teach `@urcolor/core`'s parser the NCS notation. Returns a dispose function
 * that removes it again; calling dispose twice is a no-op.
 *
 * Not a side effect of importing this package, matching
 * `registerRelativeColor()`. Until it is called, `Color.parse("S 1050-Y90R")`
 * returns `null` like any other unrecognised string.
 */
export function registerNcsColor(): () => void {
  return registerParser(ncsParser);
}

/**
 * A colour as NCS notation, for example `S 1347-Y83R`.
 *
 * Values are exact rather than snapped to the NCS standard sample grid, so the
 * result round-trips through `Color.parse()` but does not necessarily name a
 * real, orderable NCS sample. Colours outside what NCS can express are
 * clamped, so this always returns a notation; round-trip the result and
 * compare if you need to know whether it was faithful.
 */
export function toNcs(color: Color): string {
  return formatNotation(fromOklch(color.toObject()));
}

export { parseNotation, formatNotation, ELEMENTARY } from "./notation";
export type { Elementary, NcsColor, NcsHue } from "./notation";
export { toOklch, fromOklch, KNOTS, KNOT_COUNT } from "./model";
export type { Knot } from "./model";
export { ncsParser } from "./parse";

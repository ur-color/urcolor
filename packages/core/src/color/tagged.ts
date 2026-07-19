/**
 * Type-level color-space tagging on top of the runtime {@link ColorObject}.
 *
 * `ColorIn<S>` narrows `space` to a single literal `SpaceId`, so a value
 * produced or converted into a known space carries that guarantee through
 * the type system (e.g. a function that requires `SrgbColor` cannot accept
 * an untagged `oklch` value). This is purely a compile-time contract: the
 * runtime shape is identical to {@link ColorObject}.
 */

import type { ColorObject, Coords, SpaceId } from "./types";

/** A {@link ColorObject} whose `space` is narrowed to the literal `S`. */
export interface ColorIn<S extends SpaceId> extends ColorObject {
  space: S;
}

/** An sRGB-tagged color. */
export type SrgbColor = ColorIn<"srgb">;
/** A Display P3-tagged color. */
export type P3Color = ColorIn<"display-p3">;
/** An Oklch-tagged color. */
export type OklchColor = ColorIn<"oklch">;

/** Construct a {@link ColorIn} value, tagged with its space at the type level. */
export function color<S extends SpaceId>(space: S, coords: Coords, alpha?: number): ColorIn<S> {
  return { space, coords, alpha: alpha ?? 1 };
}

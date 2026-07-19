/**
 * The serialiser. With no format, a color is written in its own space's CSS
 * notation. With an explicit format it is converted first, so
 * `serialize(anyColor, "hex")` and `serialize(anyColor, "oklch")` always work.
 */

import { convert } from "./convert";
import { serializeColorFn } from "./spaces/colorFn";
import { serializeHsl } from "./spaces/hsl";
import { serializeHwb } from "./spaces/hwb";
import { serializeLab } from "./spaces/lab";
import { serializeLch } from "./spaces/lch";
import { serializeOklab } from "./spaces/oklab";
import { serializeOklch } from "./spaces/oklch";
import { serializeHex, serializeRgb } from "./spaces/srgb";
import type { ColorObject, SpaceId } from "./types";

/**
 * Output format: any space id with a CSS notation, or `"hex"` for
 * `#rrggbb[aa]`. `hsv` is excluded — it has no CSS form, and an `hsv` color
 * serialises down to `rgb()` instead.
 */
export type ColorFormat = Exclude<SpaceId, "hsv"> | "hex";

type Serializer = (color: ColorObject) => string;

const SERIALIZERS: Record<SpaceId, Serializer> = {
  srgb: serializeRgb,
  "srgb-linear": serializeColorFn,
  hsl: serializeHsl,
  // hsv has no CSS notation; fall back to sRGB.
  hsv: (color) => serializeRgb(convert(color, "srgb")),
  hwb: serializeHwb,
  lab: serializeLab,
  lch: serializeLch,
  oklab: serializeOklab,
  oklch: serializeOklch,
  "display-p3": serializeColorFn,
  "a98-rgb": serializeColorFn,
  "prophoto-rgb": serializeColorFn,
  rec2020: serializeColorFn,
  "xyz-d65": serializeColorFn,
  "xyz-d50": serializeColorFn,
};

/** Serialise a color to a CSS string in the given (or its own) format. */
export function serialize(color: ColorObject, format?: ColorFormat): string {
  if (format === "hex") return serializeHex(convert(color, "srgb"));
  const target = format ?? color.space;
  return SERIALIZERS[target](target === color.space ? color : convert(color, target));
}

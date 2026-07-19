/**
 * The string parser. Tries each CSS Color 4 notation in turn and returns the
 * normalised {@link ColorObject}. {@link parse} throws on failure (like
 * `Temporal.*.from`); {@link tryParse} returns `null`.
 */

import { parseNamed } from "./named";
import { parseColorFn } from "./spaces/colorFn";
import { parseHsl } from "./spaces/hsl";
import { parseHwb } from "./spaces/hwb";
import { parseLab } from "./spaces/lab";
import { parseLch } from "./spaces/lch";
import { parseOklab } from "./spaces/oklab";
import { parseOklch } from "./spaces/oklch";
import { parseHex, parseRgb } from "./spaces/srgb";
import type { ColorObject } from "./types";

type Parser = (input: string) => ColorObject | null;

// Ordered by cheapest / most common first. Functional notations are mutually
// exclusive by name, so order among them doesn't matter for correctness.
const PARSERS: Parser[] = [
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

/** Parse a CSS color string, or `null` if no notation matches. */
export function tryParse(input: string): ColorObject | null {
  for (const p of PARSERS) {
    const result = p(input);
    if (result) return result;
  }
  return null;
}

/** Parse a CSS color string; throws {@link SyntaxError} on failure. */
export function parse(input: string): ColorObject {
  const result = tryParse(input);
  if (!result) throw new SyntaxError(`Invalid color: ${JSON.stringify(input)}`);
  return result;
}

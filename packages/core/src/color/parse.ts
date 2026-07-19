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

/** Parse a CSS color string; throws {@link SyntaxError} on failure. */
export function parse(input: string): ColorObject {
  const result = tryParse(input);
  if (!result) throw new SyntaxError(`Invalid color: ${JSON.stringify(input)}`);
  return result;
}

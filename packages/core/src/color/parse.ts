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

/**
 * The functional notations, keyed by the lowercased name before the `(`.
 *
 * Trying every parser in turn meant a `lab()` string was offered to nine
 * parsers that could not possibly match, and an unparseable string to all ten —
 * each one compiling a `RegExp` to say no. Since the names are mutually
 * exclusive, one string scan picks the single candidate instead. Each parser
 * still runs unchanged: this only decides *which* to call, never how it behaves.
 */
const FN_PARSERS: Readonly<Record<string, ColorParser>> = {
  rgb: parseRgb,
  rgba: parseRgb,
  hsl: parseHsl,
  hsla: parseHsl,
  hwb: parseHwb,
  color: parseColorFn,
  oklch: parseOklch,
  oklab: parseOklab,
  lch: parseLch,
  lab: parseLab,
};

/**
 * The one built-in that could match `input`, or `null` if none can.
 *
 * Dispatch reads the trimmed input, but the chosen parser is handed the
 * original string — every built-in trims for itself, so nothing downstream can
 * observe the difference.
 */
function builtinFor(input: string): ColorParser | null {
  const s = input.trim();
  if (s.charCodeAt(0) === 35 /* # */) return parseHex;
  const open = s.indexOf("(");
  if (open > 0) return FN_PARSERS[s.slice(0, open).toLowerCase()] ?? null;
  // No `(` and no `#`: only a bare keyword is left.
  return open < 0 ? parseNamed : null;
}

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

/**
 * Whether every coordinate and the alpha are real numbers. The built-in
 * parsers match on notation *shape* and run each token through
 * `Number.parseFloat`, so a syntactically well-formed call with non-numeric
 * tokens — `hsl(from red h s l)` — yields `NaN` coords rather than a miss.
 * Treating that as a miss is what lets a registered parser (e.g. relative
 * color syntax) see the input at all.
 */
function isNumeric(color: ColorObject): boolean {
  return color.coords.every(Number.isFinite) && Number.isFinite(color.alpha);
}

/** Parse a CSS color string, or `null` if no notation matches. */
export function tryParse(input: string): ColorObject | null {
  const builtin = builtinFor(input);
  if (builtin) {
    const result = builtin(input);
    // A non-numeric result is a miss, not a match: it lets a registered parser
    // (relative color syntax, say) see `hsl(from red h s l)` for itself.
    if (result && isNumeric(result)) return result;
  }
  for (const p of registered) {
    // Registered parsers are third-party code, unlike the built-ins above.
    // A throwing plugin must not break parsing for every other notation, so
    // treat a throw as a miss and keep consulting the remaining parsers.
    let result: ColorObject | null;
    try {
      result = p(input);
    } catch {
      continue;
    }
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

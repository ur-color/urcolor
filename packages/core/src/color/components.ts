/**
 * Shared parsing/serialising helpers for CSS functional color notations
 * (`hsl()`, `hwb()`, `lab()`, `lch()`, `oklab()`, `oklch()`, `color()`). These
 * handle the syntax common to all of them: legacy comma vs modern space
 * separation, an optional `/ alpha`, `none` keywords, and percentage tokens.
 */

/** The channel tokens and alpha extracted from a functional notation body. */
export interface Components {
  /** The raw inner text, before any splitting. */
  body: string;
  args: string[];
  /** `undefined` when no alpha was written (caller defaults to 1). */
  alpha: number | undefined;
}

/** Index of the first `/` at parenthesis depth 0, or -1. */
function topLevelSlash(body: string): number {
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "/" && depth === 0) return i;
  }
  return -1;
}

/**
 * Match `name(...)` (case-insensitive) and split the body into channel tokens
 * plus an optional alpha. Returns `null` when the notation name doesn't match.
 */
export function parseFn(input: string, name: string): Components | null {
  const re = new RegExp(`^${name}\\(\\s*(.+?)\\s*\\)$`, "i");
  const m = input.trim().match(re);
  const body = m?.[1];
  if (body === undefined) return null;
  const slash = topLevelSlash(body);
  const main = slash >= 0 ? body.slice(0, slash) : body;
  const args = main
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  const alpha = slash >= 0 ? parseAlpha(body.slice(slash + 1).trim()) : undefined;
  return { body, args, alpha };
}

/** Parse an alpha token (`none` -> 0, `50%` -> 0.5, `0.5` -> 0.5). */
export function parseAlpha(token: string): number {
  if (token === "none") return 0;
  if (token.endsWith("%")) return Number.parseFloat(token) / 100;
  return Number.parseFloat(token);
}

/** Parse a percentage-or-number token, scaling `%` by `scale` (`none` -> 0). */
export function parsePercentOrNumber(token: string, scale = 1): number {
  if (token === "none") return 0;
  if (token.endsWith("%")) return (Number.parseFloat(token) / 100) * scale;
  return Number.parseFloat(token);
}

/** Parse a hue token in `deg`/`grad`/`rad`/`turn` (or bare) to degrees. */
export function parseHue(token: string): number {
  if (token === "none") return 0;
  const n = Number.parseFloat(token);
  if (token.endsWith("grad")) return n * 0.9;
  if (token.endsWith("rad")) return (n * 180) / Math.PI;
  if (token.endsWith("turn")) return n * 360;
  return n; // deg or bare
}

/** Format a number for CSS output: trim to `prec` decimals, drop trailing 0s. */
export function num(n: number, prec = 4): number {
  return Number.parseFloat(n.toFixed(prec));
}

/** Append ` / a` when alpha < 1, matching CSS modern serialisation. */
export function alphaSuffix(alpha: number): string {
  return alpha < 1 ? ` / ${num(alpha)}` : "";
}

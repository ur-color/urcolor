/**
 * Shared parsing/serialising helpers for CSS functional color notations
 * (`hsl()`, `hwb()`, `lab()`, `lch()`, `oklab()`, `oklch()`, `color()`). These
 * handle the syntax common to all of them: legacy comma vs modern space
 * separation, an optional `/ alpha`, `none` keywords, and percentage tokens.
 */

import type { NotationChannel } from "./notations";

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
 * Compiled `name(...)` matchers, keyed by the notation-name pattern.
 *
 * The pattern set is closed (one entry per built-in notation, plus whatever a
 * plugin passes), so this never grows unbounded. Building the `RegExp` inline
 * cost ~180 ns per call — paid once per parser *attempted*, which the miss path
 * multiplies by the number of notations.
 */
const FN_PATTERNS = new Map<string, RegExp>();

function fnPattern(name: string): RegExp {
  let re = FN_PATTERNS.get(name);
  if (re === undefined) {
    re = new RegExp(`^${name}\\(\\s*(.+?)\\s*\\)$`, "i");
    FN_PATTERNS.set(name, re);
  }
  return re;
}

/**
 * Match `name(...)` (case-insensitive) and split the body into channel tokens
 * plus an optional alpha. Returns `null` when the notation name doesn't match.
 */
export function parseFn(input: string, name: string): Components | null {
  const m = input.trim().match(fnPattern(name));
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

/** Exact powers of ten, for the {@link num} fast path. */
const POW10 = [1, 1e1, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10];

/**
 * Format a number for CSS output: trim to `prec` decimals, drop trailing 0s.
 *
 * Defined as `Number.parseFloat(n.toFixed(prec))`, but that pair costs ~115 ns —
 * more than the colour maths feeding it, and every serialiser calls it three or
 * four times. The fast path scales, rounds, and divides instead (~3 ns).
 *
 * It is *exactly* equivalent, not approximately:
 *
 * - `toFixed` rounds the exact binary value of `n`, ties away from zero. Taking
 *   the absolute value first makes `Math.round` (ties toward `+∞`) agree, and
 *   the sign is reapplied afterwards. Rounding `-1.25` to one decimal gives
 *   `-1.3`, where a naive `Math.round(n * 10) / 10` would give `-1.2`.
 * - `scaled = a * f` carries at most a half-ulp of error, so a value near a
 *   half-integer could round the wrong way. `slack` bounds that error; anything
 *   inside it — including every genuine tie — defers to `toFixed`.
 * - `r / f` divides an exact integer by an exact power of ten. IEEE division is
 *   correctly rounded, so the result is the nearest double to `r / 10^prec` —
 *   which is precisely what parsing the decimal string would have produced.
 *
 * Anything outside the fast path's domain (non-finite, `prec` beyond the table,
 * magnitudes where the scaled value stops being exactly representable) falls
 * back, so the slow path still defines the contract.
 */
export function num(n: number, prec = 4): number {
  const f = POW10[prec];
  if (f === undefined || !Number.isFinite(n)) return Number.parseFloat(n.toFixed(prec));

  // `Math.abs`, not `n < 0 ? -n : n`: the latter leaves `-0` negative, while
  // `toFixed` only emits a sign for `x < 0` — which `-0` is not — so it would
  // round-trip `-0` to `+0`. The sign is reapplied below, so `-1e-9` still
  // yields `-0` exactly as before.
  const a = Math.abs(n);
  const scaled = a * f;
  if (scaled >= 1e15) return Number.parseFloat(n.toFixed(prec));

  const r = Math.round(scaled);
  // Distance to the rounding boundary, against the multiply's own error bound.
  const slack = scaled * 2.3e-16 + 1e-12;
  if (0.5 - Math.abs(scaled - r) < slack) return Number.parseFloat(n.toFixed(prec));

  const q = r / f;
  return n < 0 ? -q : q;
}

/** Append ` / a` when alpha < 1, matching CSS modern serialisation. */
export function alphaSuffix(alpha: number): string {
  return alpha < 1 ? ` / ${num(alpha)}` : "";
}

/**
 * Resolve a channel token to its native storage value, using the channel's
 * percent reference and unit mapping. `none` -> 0; angles go through
 * {@link parseHue}; `%` scales by `percentRef`.
 */
export function parseChannelToken(token: string, ch: NotationChannel): number {
  if (token === "none") return 0;
  if (ch.angle) return parseHue(token);
  const css = token.endsWith("%")
    ? (Number.parseFloat(token) / 100) * ch.percentRef
    : Number.parseFloat(token);
  return ch.toNative(css);
}

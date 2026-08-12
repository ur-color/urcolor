/**
 * The NCS notation grammar: string to and from `{ blackness, chromaticness,
 * hue }`.
 *
 * Grammar only, deliberately. The colour maths in `./model` is an
 * approximation of a proprietary system, while the notation itself is exactly
 * specified — keeping them apart means the uncertain half is quarantined in
 * one file, and improving the maths later cannot break parsing.
 */

/** The four NCS elementary hues, in circle order: `Y -> R -> B -> G -> Y`. */
export const ELEMENTARY = ["Y", "R", "B", "G"] as const;

export type Elementary = typeof ELEMENTARY[number];

/**
 * A hue on the NCS circle.
 *
 * `to` is `null` for an elementary hue (`Y`), otherwise the notation names two
 * adjacent hues and how far between them the colour sits (`Y90R` is 90% of the
 * way from `Y` to `R`).
 */
export interface NcsHue {
  from: Elementary;
  to: Elementary | null;
  /** 0–100. Always 0 when `to` is null. */
  percent: number;
}

/** A parsed NCS colour. `hue` is `null` on the neutral (`-N`) axis. */
export interface NcsColor {
  /** 0–100. The `s` of `s + c <= 100`. */
  blackness: number;
  /** 0–100. The `c` of `s + c <= 100`. */
  chromaticness: number;
  hue: NcsHue | null;
}

/**
 * Both prefix forms are optional, and `ncs(...)` may wrap either. The bare
 * forms are how NCS is written everywhere outside this package; the functional
 * form fits core's `name(` dispatch and reads naturally beside `oklch(...)`.
 *
 * `S` marks the NCS 1950 standard edition. It is accepted and ignored: this
 * package models one edition, and discarding the marker beats rejecting the
 * notation most callers will paste.
 */
const NOTATION = /^(?:NCS\s+)?(?:S\s*)?(\d{2})(\d{2})\s*-\s*(?:N|([YRBG])(?:(\d{2})([YRBG]))?)$/i;

/** `ncs( … )`, with the body handed back to the bare-form matcher. */
const FUNCTIONAL = /^ncs\(([^)]*)\)$/i;

/**
 * Adjacency on the `Y -> R -> B -> G -> Y` circle.
 *
 * NCS holds that no hue resembles both members of an opponent pair, so there
 * is no redgreen and no yellowblue. `Y90R` is a colour; `R90G` and `Y50B` are
 * not, and are rejected rather than answered with an invented value.
 */
function isAdjacent(from: Elementary, to: Elementary): boolean {
  const i = ELEMENTARY.indexOf(from);
  const j = ELEMENTARY.indexOf(to);
  return (i + 1) % ELEMENTARY.length === j;
}

/**
 * Parse an NCS notation string, or `null` if it is not one.
 *
 * Never throws. Two rules reject rather than guess: `blackness +
 * chromaticness` must not exceed 100, which NCS requires, and a hue pair must
 * name adjacent hues.
 */
export function parseNotation(input: string): NcsColor | null {
  const trimmed = input.trim();
  const fn = FUNCTIONAL.exec(trimmed);
  const body = fn === null ? trimmed : fn[1]!.trim();

  const m = NOTATION.exec(body);
  if (m === null) return null;

  const blackness = Number(m[1]);
  const chromaticness = Number(m[2]);
  // Whiteness is the remainder, so a pair summing over 100 describes nothing.
  if (blackness + chromaticness > 100) return null;

  const from = m[3]?.toUpperCase() as Elementary | undefined;
  if (from === undefined) {
    // The neutral axis carries no hue, so any chromaticness is a contradiction.
    return chromaticness === 0 ? { blackness, chromaticness: 0, hue: null } : null;
  }

  const to = m[5]?.toUpperCase() as Elementary | undefined;
  if (to === undefined) return { blackness, chromaticness, hue: { from, to: null, percent: 0 } };

  if (!isAdjacent(from, to)) return null;
  return { blackness, chromaticness, hue: { from, to, percent: Number(m[4]) } };
}

const pad = (n: number) => String(Math.round(n)).padStart(2, "0");

/**
 * Render an `NcsColor` in the canonical `S 1050-Y90R` form.
 *
 * The `S` prefix is always emitted even though it is optional on input: it is
 * what NCS itself prints, and a caller pasting the output into a specification
 * gets the conventional spelling.
 */
export function formatNotation(color: NcsColor): string {
  const head = `S ${pad(color.blackness)}${pad(color.chromaticness)}-`;
  if (color.hue === null) return `${head}N`;
  if (color.hue.to === null) return `${head}${color.hue.from}`;
  return `${head}${color.hue.from}${pad(color.hue.percent)}${color.hue.to}`;
}

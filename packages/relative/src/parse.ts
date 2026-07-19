/**
 * The relative-color parser: `name(from <origin> <c1> <c2> <c3> [/ <alpha>])`.
 *
 * The origin is parsed with core's own parser, converted into the target
 * notation's space, and exposed to each channel expression as a named value
 * (see `./scope`). Expressions are evaluated by `./math` and then mapped from
 * CSS units back to native storage units through core's `NOTATIONS` table, so
 * this plugin cannot drift from the built-in absolute parsers.
 *
 * Every failure path returns `null`; nothing here throws.
 */

import {
  NOTATIONS,
  tryParse,
  type ColorObject,
  type ColorParser,
  type Coords,
  type NotationChannel,
  type NotationDef,
  type SpaceId,
} from "@urcolor/core";
import { evaluateMath, type MathScope, type MathValue } from "./math";
import { buildScope } from "./scope";

/** The eight CSS functional notations that accept relative syntax. */
const NOTATION_NAMES = ["rgb", "hsl", "hwb", "lab", "lch", "oklab", "oklch", "color"] as const;

/** Index of the first `/` at parenthesis depth 0, or -1. Mirrors core's scan. */
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

/** Split on whitespace at parenthesis depth 0, keeping `calc(h + 180)` whole. */
function splitTopLevel(input: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = -1;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (ch === "(") depth++;
    else if (ch === ")") depth--;

    if (depth === 0 && /[\s,]/.test(ch)) {
      if (start >= 0) {
        out.push(input.slice(start, i));
        start = -1;
      }
      continue;
    }
    if (start < 0) start = i;
  }

  if (start >= 0) out.push(input.slice(start));
  return out;
}

/**
 * Consume one origin token starting at `from`, honouring nesting: a functional
 * origin (`rgb(1 2 3 / 40%)`) runs to its matching close paren, a bare one
 * (`red`, `#ff0000`) to the next whitespace.
 *
 * @returns the token and the index just past it, or `null` if parens are unbalanced.
 */
function readOrigin(input: string, from: number): { token: string; end: number } | null {
  let i = from;
  while (i < input.length && /\s/.test(input[i]!)) i++;
  const start = i;
  let depth = 0;

  for (; i < input.length; i++) {
    const ch = input[i]!;
    if (ch === "(") {
      depth++;
    } else if (ch === ")") {
      depth--;
      if (depth < 0) return null;
      if (depth === 0) {
        i++;
        break;
      }
    } else if (depth === 0 && /\s/.test(ch)) {
      break;
    }
  }

  if (depth !== 0) return null;
  const token = input.slice(start, i);
  return token.length === 0 ? null : { token, end: i };
}

/**
 * Resolve a `color()` space keyword by asking core to parse a probe string, so
 * the accepted keyword set (including the `xyz` alias) is never duplicated here.
 */
function resolveColorFnSpace(keyword: string): SpaceId | null {
  if (!/^[a-z0-9-]+$/i.test(keyword)) return null;
  return tryParse(`color(${keyword} 0 0 0)`)?.space ?? null;
}

/**
 * `color()` covers both the RGB-family spaces and the XYZ ones with a single
 * channel triple, so core's `NOTATIONS.color` can only name one of the two
 * keyword sets — it names `r`/`g`/`b`. For `xyz`, `xyz-d50` and `xyz-d65` the
 * spec's keywords are `x`/`y`/`z` instead. Only the names differ; the unit
 * metadata is identical, so it is rebound here, where the space is known.
 */
const XYZ_CHANNEL_NAMES = ["x", "y", "z"] as const;

function channelsForColorFn(
  channels: readonly [NotationChannel, NotationChannel, NotationChannel],
  space: SpaceId,
): [NotationChannel, NotationChannel, NotationChannel] {
  if (space !== "xyz-d50" && space !== "xyz-d65") return [...channels];
  return channels.map((ch, i) => ({ ...ch, name: XYZ_CHANNEL_NAMES[i]! })) as
    [NotationChannel, NotationChannel, NotationChannel];
}

/** Map an evaluated channel value from CSS units to native storage units. */
function toNative(value: MathValue, ch: NotationChannel): number | null {
  // CSS has no percentage hues, and a hue channel's percentRef is inert.
  if (ch.angle) return value.percent ? null : value.value;
  const css = value.percent ? (value.value / 100) * ch.percentRef : value.value;
  return ch.toNative(css);
}

/** Evaluate one channel expression. Identifiers are case-folded to match scope. */
function evalIn(expr: string, scope: MathScope): MathValue | null {
  return evaluateMath(expr.toLowerCase(), scope);
}

/** Parse one notation's relative form, or `null` if it isn't one. */
function parseRelative(input: string, name: string): ColorObject | null {
  const m = input.trim().match(new RegExp(`^${name}\\(\\s*([\\s\\S]+?)\\s*\\)$`, "i"));
  const body = m?.[1];
  if (body === undefined) return null;

  // `from` must be a whitespace-delimited leading keyword.
  const lead = body.match(/^from\s+/i);
  if (!lead) return null;

  // Split off alpha FIRST: CSS allows `h s l/0.5` with no spaces, and `l/0.5`
  // would otherwise evaluate as a valid division instead of failing.
  const slash = topLevelSlash(body);
  const main = slash >= 0 ? body.slice(0, slash) : body;
  const alphaExpr = slash >= 0 ? body.slice(slash + 1).trim() : undefined;
  if (alphaExpr !== undefined && alphaExpr.length === 0) return null;

  const origin = readOrigin(main, lead[0].length);
  if (!origin) return null;

  const originColor = tryParse(origin.token);
  if (!originColor) return null;

  const tokens = splitTopLevel(main.slice(origin.end));

  const def: NotationDef | undefined = NOTATIONS[name];
  if (!def) return null;

  let space: SpaceId;
  let channelExprs: string[];
  let channels: [NotationChannel, NotationChannel, NotationChannel];
  if (name === "color") {
    if (tokens.length !== 4) return null;
    const resolved = resolveColorFnSpace(tokens[0]!);
    if (!resolved) return null;
    space = resolved;
    channelExprs = tokens.slice(1);
    channels = channelsForColorFn(def.channels, space);
  } else {
    if (tokens.length !== 3) return null;
    space = def.space;
    channelExprs = tokens;
    channels = def.channels;
  }

  const scope = buildScope(originColor, channels, space);

  const coords = [0, 0, 0] as unknown as Coords;
  for (let i = 0; i < 3; i++) {
    const value = evalIn(channelExprs[i]!, scope);
    if (!value) return null;
    const native = toNative(value, channels[i]!);
    if (native === null || !Number.isFinite(native)) return null;
    coords[i] = native;
  }

  let alpha = scope.alpha!.value;
  if (alphaExpr !== undefined) {
    const value = evalIn(alphaExpr, scope);
    if (!value) return null;
    alpha = value.percent ? value.value / 100 : value.value;
    if (!Number.isFinite(alpha)) return null;
  }

  return { space, coords, alpha };
}

/** Core-compatible parser covering relative syntax for all eight notations. */
export const relativeParser: ColorParser = (input) => {
  for (const name of NOTATION_NAMES) {
    const result = parseRelative(input, name);
    if (result) return result;
  }
  return null;
};

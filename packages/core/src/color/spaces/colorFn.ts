/**
 * The CSS `color()` function — a predefined-RGB / XYZ color in an explicit
 * space, e.g. `color(display-p3 1 0 0 / 0.5)`. Channels are numbers or
 * percentages; `xyz` is an alias for `xyz-d65`.
 */

import { alphaSuffix, num, parseAlpha, parseChannelToken, parseFn } from "../components";
import { NOTATIONS } from "../notations";
import type { ColorObject, Coords, SpaceId } from "../types";

/** `color()` space keywords -> canonical {@link SpaceId} (with the `xyz` alias). */
const COLOR_FN_SPACES: Readonly<Record<string, SpaceId>> = {
  "srgb": "srgb",
  "srgb-linear": "srgb-linear",
  "display-p3": "display-p3",
  "a98-rgb": "a98-rgb",
  "prophoto-rgb": "prophoto-rgb",
  "rec2020": "rec2020",
  "xyz": "xyz-d65",
  "xyz-d65": "xyz-d65",
  "xyz-d50": "xyz-d50",
};

/** SpaceId -> the keyword written inside `color()`. */
const SPACE_TO_KEYWORD: Partial<Record<SpaceId, string>> = {
  "srgb": "srgb",
  "srgb-linear": "srgb-linear",
  "display-p3": "display-p3",
  "a98-rgb": "a98-rgb",
  "prophoto-rgb": "prophoto-rgb",
  "rec2020": "rec2020",
  "xyz-d65": "xyz-d65",
  "xyz-d50": "xyz-d50",
};

/** Parse a `color()` string, or `null` if it isn't one / the space is unknown. */
export function parseColorFn(input: string): ColorObject | null {
  const c = parseFn(input, "color");
  if (!c || c.args.length < 4) return null; // keyword + 3 channels
  const [keyword = "", x = "", y = "", z = "", a] = c.args;
  const space = COLOR_FN_SPACES[keyword.toLowerCase()];
  if (!space) return null;
  const ch = NOTATIONS.color!.channels;
  const coords: Coords = [
    parseChannelToken(x, ch[0]),
    parseChannelToken(y, ch[1]),
    parseChannelToken(z, ch[2]),
  ];
  const alpha = c.alpha ?? (a !== undefined ? parseAlpha(a) : 1);
  return { space, coords, alpha };
}

/** Whether a space serialises via `color()` (vs its own function like `lab()`). */
export function isColorFnSpace(space: SpaceId): boolean {
  return space in SPACE_TO_KEYWORD;
}

/** Serialise a predefined-RGB / XYZ color to `color(space c c c [/ a])`. */
export function serializeColorFn(color: ColorObject): string {
  const keyword = SPACE_TO_KEYWORD[color.space] ?? color.space;
  const [a, b, c] = color.coords;
  return `color(${keyword} ${num(a, 5)} ${num(b, 5)} ${num(c, 5)}${alphaSuffix(color.alpha)})`;
}

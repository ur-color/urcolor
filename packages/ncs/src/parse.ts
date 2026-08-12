/**
 * The NCS parser handed to core's `registerParser`.
 *
 * Registered parsers run after every built-in, so this can neither shadow nor
 * slow a standard notation. Every failure path returns `null`; nothing here
 * throws.
 */

import type { ColorParser } from "@urcolor/core";
import { toOklch } from "./model";
import { parseNotation } from "./notation";

export const ncsParser: ColorParser = (input) => {
  const notation = parseNotation(input);
  return notation === null ? null : toOklch(notation);
};

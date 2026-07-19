/**
 * `@urcolor/relative` — CSS Color 5 relative-color syntax for `@urcolor/core`.
 *
 * ```ts
 * import { Color } from "@urcolor/core";
 * import { registerRelativeColor } from "@urcolor/relative";
 *
 * registerRelativeColor();
 * Color.parse("oklch(from #3b82f6 calc(l * 0.8) c h)");
 * ```
 */

import { registerParser } from "@urcolor/core";
import { relativeParser } from "./parse";

/**
 * Teach `@urcolor/core`'s parser the relative-color syntax. Returns a dispose
 * function that removes it again; calling dispose twice is a no-op.
 */
export function registerRelativeColor(): () => void {
  return registerParser(relativeParser);
}

export { evaluateMath, type MathScope, type MathValue } from "./math";

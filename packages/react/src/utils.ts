import { PAGE_KEYS as PAGE_KEYS_LITERAL, ARROW_KEYS as ARROW_KEYS_LITERAL } from "@urcolor/shared";

export {
  clamp,
  getDecimalCount,
  roundValue,
  snapToStep,
  linearScale,
  convertValueToPercentage,
  getThumbInBoundsOffset,
  getClosestThumbIndex,
  hasMinStepsBetweenValues,
} from "@urcolor/shared";

// Re-declared with a widened element type rather than re-exported directly:
// the primitives originals are `as const`, so `ARROW_KEYS.includes(event.key)`
// — how every call site here uses them — would reject a plain `string`.
export const PAGE_KEYS: readonly string[] = PAGE_KEYS_LITERAL;
export const ARROW_KEYS: readonly string[] = ARROW_KEYS_LITERAL;

export { CHECKERBOARD_BACKGROUND, warnCheckerboardDeprecated } from "@urcolor/shared";

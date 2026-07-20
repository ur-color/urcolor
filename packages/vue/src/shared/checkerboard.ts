/** CSS `background` value that paints the transparency checkerboard. */
export const CHECKERBOARD_BACKGROUND
  = "repeating-conic-gradient(rgb(230, 230, 230) 0% 25%, white 0% 50%) 0% 50% / 16px 16px";

let warned = false;

/**
 * Emit a one-time deprecation warning for the standalone Checkerboard
 * components. Silent in production builds.
 */
export function warnCheckerboardDeprecated() {
  if (warned) return;
  if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "production") return;
  warned = true;
  console.warn(
    "[urcolor] The Checkerboard components are deprecated. The Gradient components now paint the checkerboard themselves; remove the standalone Checkerboard from your markup.",
  );
}

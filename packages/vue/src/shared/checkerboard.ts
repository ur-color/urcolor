// Re-exported rather than redeclared so the Vue package and `@urcolor/shared`
// can never drift on the recipe or on the custom properties it reads.
export {
  CHECKERBOARD_BACKGROUND,
  CHECKERBOARD_STYLE,
  CHECKERBOARD_VAR,
  CHECKERBOARD_VARS,
  DEFAULT_CHECKER_SIZE,
} from "@urcolor/shared";

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

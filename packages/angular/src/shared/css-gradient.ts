import type { CssGradientLayer, GradientRenderer } from "@urcolor/shared";
import { CHECKERBOARD_BACKGROUND, collapseLayers } from "@urcolor/shared";

/**
 * Which painter a gradient should use. Re-exported so consumers can type an
 * input without reaching into `@urcolor/shared`.
 */
export type { GradientRenderer };

const warned: Record<string, true> = {};

/**
 * Warn once that `renderer="css"` was asked for where no exact recipe exists.
 * Silent in production builds, following `warnCheckerboardDeprecated`.
 */
export function warnNoCssRecipe(name: string): void {
  if (warned[name]) return;
  if (typeof process !== "undefined" && process.env && process.env["NODE_ENV"] === "production") return;
  warned[name] = true;
  console.warn(
    `[urcolor] ${name} has renderer="css", but this color space and channel `
    + "combination has no exact CSS recipe. Falling back to the canvas.",
  );
}

/**
 * The `background` shorthand a gradient's host element should carry, or `null`
 * when it should paint into its canvas instead.
 *
 * Angular's gradients are directives *on* the `<canvas>` the consumer supplies,
 * so there is no element to remove and no sibling to add — the CSS path instead
 * paints the recipe as that canvas' own CSS background, which the (never
 * acquired) bitmap would otherwise have composited over. The checkerboard stays
 * as the bottom layer of the same shorthand, so there is no ordering hazard
 * between a `background` binding and a `background-image` one.
 *
 * A consequence of having exactly one element: a recipe that needs a
 * `mask-image` cannot be expressed here, because the mask would apply to the
 * whole element rather than to its own layer. `collapseLayers` merges every
 * mask-free layer into one, so this only rules out the two masked recipes —
 * corner-mode areas and areas with an alpha axis — which fall back to the
 * canvas. Every other recipe collapses to a single layer and works.
 */
export function cssGradientBackground(
  renderer: GradientRenderer,
  name: string,
  build: () => CssGradientLayer[] | null,
): string | null {
  if (renderer === "canvas") return null;

  const layers = build();
  if (!layers || layers.length === 0) {
    if (renderer === "css") warnNoCssRecipe(name);
    return null;
  }

  const collapsed = collapseLayers(layers);
  if (collapsed.length !== 1 || collapsed[0]!.mask) {
    if (renderer === "css") warnNoCssRecipe(name);
    return null;
  }

  return `${collapsed[0]!.image}, ${CHECKERBOARD_BACKGROUND}`;
}

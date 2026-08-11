import type { CssGradientLayer, GradientRenderer } from "@urcolor/shared";
import { collapseLayers } from "@urcolor/shared";

/**
 * The box the CSS layers paint into — the same one the canvas occupied.
 *
 * Layers live inside a wrapper rather than beside each other so `opacity`
 * applies to the composited stack, exactly as it did to the single canvas.
 * Applying it per layer would fade each one against what is behind it instead.
 *
 * `width`/`height` alongside `inset` for the same reason the canvas carries
 * both: `inset` alone leaves the element unsized wherever the shorthand is
 * unsupported.
 */
export const CSS_GRADIENT_ROOT_STYLE
  = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";

/** The inline style that paints one layer. */
export function cssLayerStyle(layer: CssGradientLayer): string {
  let style = "position:absolute;inset:0;width:100%;height:100%;"
    + `background-image:${layer.image};`;
  if (layer.mask) {
    // Safari carried the prefixed property well past the point the ring's own
    // mask started relying on it; the layers follow it rather than diverge.
    style += `mask-image:${layer.mask};-webkit-mask-image:${layer.mask};`;
  }
  return style;
}

/**
 * Names already warned about. A plain object rather than a `Set` because
 * nothing reads it reactively — `svelte/prefer-svelte-reactivity` would
 * otherwise push a `SvelteSet` into a module that has no reactive state at all.
 */
const warned: Record<string, true> = {};

/**
 * Warn once that `renderer="css"` was asked for where no exact recipe exists.
 * Silent in production builds, following `warnCheckerboardDeprecated`.
 */
export function warnNoCssRecipe(name: string): void {
  if (warned[name]) return;
  if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "production") return;
  warned[name] = true;
  console.warn(
    `[urcolor] ${name} has renderer="css", but this color space and channel `
    + "combination has no exact CSS recipe. Falling back to the canvas.",
  );
}

/**
 * Resolve which painter a gradient should use.
 *
 * `null` means the canvas: the caller asked for it, a `child` snippet took over
 * the canvas element, or no exact recipe exists for this space and channel
 * combination. A non-null value is the collapsed layer list, ready to render —
 * and the component's `<canvas>` is then never created at all, which is what
 * makes the gradient survive server rendering and frees a WebGL context slot.
 *
 * A `child` snippet forces the canvas because it receives the canvas' props,
 * paint attachment included; there is nothing to hand it on the CSS path.
 */
export function resolveCssGradient(
  renderer: GradientRenderer,
  name: string,
  hasChild: boolean,
  build: () => CssGradientLayer[] | null,
): CssGradientLayer[] | null {
  if (renderer === "canvas" || hasChild) return null;

  const layers = build();
  if (!layers || layers.length === 0) {
    if (renderer === "css") warnNoCssRecipe(name);
    return null;
  }
  return collapseLayers(layers);
}

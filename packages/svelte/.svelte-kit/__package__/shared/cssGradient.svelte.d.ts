import type { CssGradientLayer, GradientRenderer } from "@urcolor/shared";
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
export declare const CSS_GRADIENT_ROOT_STYLE = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
/** The inline style that paints one layer. */
export declare function cssLayerStyle(layer: CssGradientLayer): string;
/**
 * Warn once that `renderer="css"` was asked for where no exact recipe exists.
 * Silent in production builds, following `warnCheckerboardDeprecated`.
 */
export declare function warnNoCssRecipe(name: string): void;
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
export declare function resolveCssGradient(renderer: GradientRenderer, name: string, hasChild: boolean, build: () => CssGradientLayer[] | null): CssGradientLayer[] | null;

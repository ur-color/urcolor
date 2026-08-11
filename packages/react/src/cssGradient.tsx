import type { CssGradientLayer, GradientRenderer } from "@urcolor/shared";
import type { CSSProperties, ReactNode } from "react";
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
export const CSS_GRADIENT_ROOT_STYLE: CSSProperties = {
  position: "absolute",
  inset: "0",
  width: "100%",
  height: "100%",
  pointerEvents: "none",
};

/** Turn one layer into the style that paints it. */
export function cssLayerStyle(layer: CssGradientLayer): CSSProperties {
  const style: CSSProperties = {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    backgroundImage: layer.image,
  };
  if (layer.mask) {
    style.maskImage = layer.mask;
    // Safari carried the prefixed property well past the point the ring's own
    // mask started relying on it; the layers follow it rather than diverge.
    style.WebkitMaskImage = layer.mask;
  }
  return style;
}

const warned = new Set<string>();

/**
 * Warn once that `renderer="css"` was asked for where no exact recipe exists.
 * Silent in production builds, following `warnCheckerboardDeprecated`.
 */
export function warnNoCssRecipe(name: string): void {
  if (warned.has(name)) return;
  if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "production") return;
  warned.add(name);
  console.warn(
    `[urcolor] ${name} has renderer="css", but this color space and channel `
    + "combination has no exact CSS recipe. Falling back to the canvas.",
  );
}

/**
 * Resolve which painter a gradient should use.
 *
 * `null` means the canvas: either the caller asked for it, or no exact recipe
 * exists for this space and channel combination. A non-null value is the
 * collapsed layer list, ready to render — and the component's `<canvas>` is
 * then never created at all, which is what makes the gradient survive server
 * rendering and frees a WebGL context slot.
 *
 * Not a hook: it is a plain derivation from props and context, called during
 * render. Memoising it would only trade a handful of color conversions for a
 * dependency array that has to be kept in step with the builder by hand.
 */
export function resolveCssGradient(
  renderer: GradientRenderer,
  name: string,
  build: () => CssGradientLayer[] | null,
): CssGradientLayer[] | null {
  if (renderer === "canvas") return null;

  const layers = build();
  if (!layers || layers.length === 0) {
    if (renderer === "css") warnNoCssRecipe(name);
    return null;
  }
  return collapseLayers(layers);
}

/** Render a resolved layer list into the wrapper span the canvas used to fill. */
export function CssGradientLayers(
  { layers, style }: { layers: CssGradientLayer[]; style?: CSSProperties },
): ReactNode {
  return (
    <span style={{ ...CSS_GRADIENT_ROOT_STYLE, ...style }}>
      {layers.map((layer, i) => (
        // The list is positional and fixed for a given recipe, so the index is
        // the identity.
        <span key={i} style={cssLayerStyle(layer)} />
      ))}
    </span>
  );
}

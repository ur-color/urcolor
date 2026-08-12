import { forwardRef, useCallback, useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import { applyChannelOverrides, channelStops, cssConicStops, paintRingSurface, type GradientRenderer } from "@urcolor/shared";
import { useColorRingContext } from "../root/ColorRingRootContext";
import { CHECKERBOARD_STYLE } from "../../../utils";
import { CssGradientLayers, resolveCssGradient } from "../../../cssGradient";

export interface ColorRingGradientProps extends ComponentPropsWithoutRef<"span"> {
  /**
   * Which painter to use.
   * - `"auto"` (default) - CSS when an exact recipe exists, canvas otherwise
   * - `"css"` - force CSS; falls back to the canvas with a dev warning if none exists
   * - `"canvas"` - force the canvas painter
   */
  renderer?: GradientRenderer;
  channelOverrides?: Record<string, number> | false;
}

export const ColorRingGradient = forwardRef<HTMLSpanElement, ColorRingGradientProps>(
  function ColorRingGradient({ renderer = "auto", channelOverrides = { alpha: 1 }, style, children, ...props }, ref) {
    const rootCtx = useColorRingContext();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // The annulus is cut here and nowhere else: the canvas paints the full
    // square and this mask — which applies to the element and every descendant,
    // canvas included — hides the hole and the corners. Clipping the canvas as
    // well used to leave a seam, because the two edges are rasterised
    // independently and their partial coverage multiplies along the boundary.
    //
    // The ±0.5px on the stops is what antialiases the edges: a gradient hard
    // stop (two stops at one position) rasterises without any, so both circles
    // came out visibly stepped.
    const maskP = rootCtx.innerRadius * 100;
    const checkerboardMask = `radial-gradient(circle closest-side at center, transparent calc(${maskP}% - 0.5px), #000 calc(${maskP}% + 0.5px), #000 calc(100% - 0.5px), transparent 100%)`;

    // `sampleConicRing` writes an opaque alpha byte for every pixel, so the CSS
    // stops drop the base color's alpha to match rather than tinting the ring.
    const cssLayers = resolveCssGradient(renderer, "ColorRingGradient", () => {
      const baseColor = rootCtx.colorRef;
      if (!baseColor) return null;
      const overridden = applyChannelOverrides(baseColor, rootCtx.colorSpace, channelOverrides).withAlpha(1);
      const stops = channelStops(overridden, rootCtx.colorSpace, rootCtx.channelKey);
      return stops && cssConicStops(stops, rootCtx.startAngle);
    });

    const render = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas || !rootCtx.colorRef) return;
      paintRingSurface({
        canvas,
        color: rootCtx.colorRef,
        colorSpace: rootCtx.colorSpace,
        channel: rootCtx.channelKey,
        startAngle: rootCtx.startAngle,
        overrides: channelOverrides,
      });
      // `innerRadius` is not a dependency: it only moves the mask, and the
      // pixels the canvas paints are the same at every radius.
    }, [rootCtx.colorRef, rootCtx.colorSpace, rootCtx.channelKey, rootCtx.startAngle, channelOverrides]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (!rootCtx.isDragging) render();
      const observer = new ResizeObserver(() => render());
      observer.observe(canvas);
      return () => observer.disconnect();
    }, [render, rootCtx.isDragging]);

    useEffect(() => {
      if (!rootCtx.isDragging) render();
    }, [rootCtx.isDragging]);

    useEffect(() => {
      return () => {
        const canvas = canvasRef.current;
        if (canvas) {
          const gl = canvas.getContext("webgl");
          if (gl) gl.getExtension("WEBGL_lose_context")?.loseContext();
        }
      };
    }, []);

    return (
      <span ref={ref} data-disabled={rootCtx.disabled ? "" : undefined} style={{ ...CHECKERBOARD_STYLE, maskImage: checkerboardMask, WebkitMaskImage: checkerboardMask, ...style }} {...props}>
        {cssLayers
          ? <CssGradientLayers layers={cssLayers} />
          : (
              <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none" }}
              />
            )}
        {children}
      </span>
    );
  },
);

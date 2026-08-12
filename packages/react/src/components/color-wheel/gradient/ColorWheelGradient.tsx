import { forwardRef, useCallback, useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import { applyChannelOverrides, cssWheelPolar, paintWheelSurface, type GradientRenderer } from "@urcolor/shared";
import { useColorWheelContext } from "../root/ColorWheelRootContext";
import { CHECKERBOARD_STYLE } from "../../../utils";
import { CssGradientLayers, resolveCssGradient } from "../../../cssGradient";

export interface ColorWheelGradientProps extends ComponentPropsWithoutRef<"span"> {
  /**
   * Which painter to use.
   * - `"auto"` (default) - CSS when an exact recipe exists, canvas otherwise
   * - `"css"` - force CSS; falls back to the canvas with a dev warning if none exists
   * - `"canvas"` - force the canvas painter
   */
  renderer?: GradientRenderer;
  channelOverrides?: Record<string, number> | false;
}

export const ColorWheelGradient = forwardRef<HTMLSpanElement, ColorWheelGradientProps>(
  function ColorWheelGradient({ renderer = "auto", channelOverrides = { alpha: 1 }, style, children, ...props }, ref) {
    const ctx = useColorWheelContext();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const cssLayers = resolveCssGradient(renderer, "ColorWheelGradient", () => {
      if (!ctx.colorRef) return null;
      return cssWheelPolar(
        applyChannelOverrides(ctx.colorRef, ctx.colorSpace, channelOverrides), ctx.colorSpace,
        ctx.angleChannelKey, ctx.radiusChannelKey, ctx.startAngle,
      );
    });

    const render = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas || !ctx.colorRef) return;
      paintWheelSurface({
        canvas,
        color: ctx.colorRef,
        colorSpace: ctx.colorSpace,
        angleChannel: ctx.angleChannelKey,
        radiusChannel: ctx.radiusChannelKey,
        startAngle: ctx.startAngle,
        overrides: channelOverrides,
      });
    }, [ctx.colorRef, ctx.colorSpace, ctx.angleChannelKey, ctx.radiusChannelKey, ctx.startAngle, channelOverrides]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (!ctx.isDragging) render();
      const observer = new ResizeObserver(() => render());
      observer.observe(canvas);
      return () => observer.disconnect();
    }, [render, ctx.isDragging]);

    useEffect(() => { if (!ctx.isDragging) render(); }, [ctx.isDragging]);

    useEffect(() => () => {
      const canvas = canvasRef.current;
      if (canvas) { const gl = canvas.getContext("webgl"); if (gl) gl.getExtension("WEBGL_lose_context")?.loseContext(); }
    }, []);

    return (
      <span ref={ref} data-disabled={ctx.disabled ? "" : undefined} style={{ ...CHECKERBOARD_STYLE, borderRadius: "50%", ...style }} {...props}>
        {/* The disc shape is cut here rather than inside `renderToCanvas`: the
            sampled grid fills its whole square, and clipping in-canvas as well
            as on the element leaves a seam along the boundary. Matches the Vue
            implementation. */}
        {cssLayers
          ? <CssGradientLayers layers={cssLayers} style={{ clipPath: "circle(50%)" }} />
          : <canvas ref={canvasRef} style={{ position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none", clipPath: "circle(50%)" }} />}
        {children}
      </span>
    );
  },
);

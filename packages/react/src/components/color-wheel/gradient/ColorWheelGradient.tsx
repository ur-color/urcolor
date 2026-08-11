import { forwardRef, useCallback, useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import { Color } from "@urcolor/core";
import { cssWheelPolar, getChannelConfig, renderToCanvas, samplePolarGrid, type GradientRenderer } from "@urcolor/shared";
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

    function applyOverrides(color: Color): Color {
      if (!channelOverrides) return color;
      let result = color;
      const updates: Record<string, number> = {};
      for (const [k, v] of Object.entries(channelOverrides)) {
        if (k === "alpha") result = result.withAlpha(v);
        else if (getChannelConfig(ctx.colorSpace, k)) updates[k] = v;
      }
      if (Object.keys(updates).length > 0) result = result.with({ space: ctx.colorSpace, ...updates });
      return result;
    }

    const cssLayers = resolveCssGradient(renderer, "ColorWheelGradient", () => {
      if (!ctx.colorRef) return null;
      return cssWheelPolar(
        applyOverrides(ctx.colorRef), ctx.colorSpace,
        ctx.angleChannelKey, ctx.radiusChannelKey, ctx.startAngle,
      );
    });

    const render = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas || !ctx.colorRef) return;
      let baseColor = ctx.colorRef;
      if (channelOverrides) {
        const updates: Record<string, number> = {};
        for (const [k, v] of Object.entries(channelOverrides)) {
          if (k === "alpha") baseColor = baseColor.withAlpha(v);
          else if (getChannelConfig(ctx.colorSpace, k)) updates[k] = v;
        }
        if (Object.keys(updates).length > 0) baseColor = baseColor.with({ space: ctx.colorSpace, ...updates });
      }

      const angleCfg = getChannelConfig(ctx.colorSpace, ctx.angleChannelKey);
      const radiusCfg = getChannelConfig(ctx.colorSpace, ctx.radiusChannelKey);
      if (!angleCfg || !radiusCfg) return;

      const aMin = angleCfg.nativeMin ?? angleCfg.min;
      const aMax = angleCfg.nativeMax ?? angleCfg.max;
      const rMin = radiusCfg.nativeMin ?? radiusCfg.min;
      const rMax = radiusCfg.nativeMax ?? radiusCfg.max;

      const size = 128;
      const pixels = samplePolarGrid(
        baseColor, ctx.colorSpace,
        ctx.angleChannelKey, ctx.radiusChannelKey,
        aMin, aMax, rMin, rMax,
        size, size, ctx.startAngle,
      );
      renderToCanvas({ canvas, pixels, sampleWidth: size, sampleHeight: size });
    }, [ctx.colorRef, ctx.colorSpace, ctx.angleChannelKey, ctx.radiusChannelKey, ctx.startAngle, ctx.isDragging, channelOverrides]);

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

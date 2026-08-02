import { forwardRef, useCallback, useEffect, useRef, useMemo, type ComponentPropsWithoutRef } from "react";
import { Color, type SpaceId } from "@urcolor/core";
import { sampleConicRing, getChannelConfig } from "@urcolor/core";
import { renderToCanvas } from "@urcolor/primitives";
import { useColorRingContext } from "../root/ColorRingRootContext";
import { CHECKERBOARD_BACKGROUND } from "../../../utils";

export interface ColorRingGradientProps extends ComponentPropsWithoutRef<"span"> {
  channelOverrides?: Record<string, number> | false;
}

export const ColorRingGradient = forwardRef<HTMLSpanElement, ColorRingGradientProps>(
  function ColorRingGradient({ channelOverrides = { alpha: 1 }, style, children, ...props }, ref) {
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

    function applyOverrides(baseColor: Color, cs: SpaceId): Color {
      if (!channelOverrides) return baseColor;
      let result = baseColor;
      const updates: Record<string, number> = {};
      for (const [k, v] of Object.entries(channelOverrides)) {
        if (k === "alpha") result = result.withAlpha(v);
        else if (getChannelConfig(cs, k)) updates[k] = v;
      }
      if (Object.keys(updates).length > 0) result = result.with({ space: cs, ...updates });
      return result;
    }

    const render = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const baseColor = rootCtx.colorRef;
      if (!baseColor) return;
      const overriddenBase = applyOverrides(baseColor, rootCtx.colorSpace);
      const cfg = getChannelConfig(rootCtx.colorSpace, rootCtx.channelKey);
      if (!cfg) return;
      const cMin = cfg.nativeMin ?? cfg.min;
      const cMax = cfg.nativeMax ?? cfg.max;
      const sampleSize = 128;
      const pixels = sampleConicRing(overriddenBase, rootCtx.colorSpace, rootCtx.channelKey, cMin, cMax, sampleSize, sampleSize, rootCtx.startAngle);
      renderToCanvas({ canvas, pixels, sampleWidth: sampleSize, sampleHeight: sampleSize });
      // `innerRadius` is not a dependency: it only moves the mask, and the
      // pixels the canvas paints are the same at every radius.
    }, [rootCtx.colorRef, rootCtx.colorSpace, rootCtx.channelKey, rootCtx.startAngle, rootCtx.isDragging, channelOverrides]);

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
      <span ref={ref} data-disabled={rootCtx.disabled ? "" : undefined} style={{ background: CHECKERBOARD_BACKGROUND, maskImage: checkerboardMask, WebkitMaskImage: checkerboardMask, ...style }} {...props}>
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none" }}
        />
        {children}
      </span>
    );
  },
);

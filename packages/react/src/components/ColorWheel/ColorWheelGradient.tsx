import { forwardRef, useCallback, useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import { Color } from "internationalized-color";
import { samplePolarGrid, getChannelConfig } from "@urcolor/core";
import { useColorWheelContext } from "./ColorWheelContext";

export interface ColorWheelGradientProps extends ComponentPropsWithoutRef<"span"> {
  channelOverrides?: Record<string, number> | false;
}

function renderToCanvas(canvas: HTMLCanvasElement, pixels: Uint8ClampedArray, size: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = typeof devicePixelRatio !== "undefined" ? devicePixelRatio : 1;
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const pixelData = new Uint8ClampedArray(pixels.buffer) as unknown as Uint8ClampedArray<ArrayBuffer>;
  const imageData = new ImageData(pixelData, size, size);
  const offscreen = new OffscreenCanvas(size, size);
  const offCtx = offscreen.getContext("2d");
  if (!offCtx) return;
  offCtx.putImageData(imageData, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const r = Math.min(cx, cy);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(offscreen, 0, 0, w, h);
  ctx.restore();
}

export const ColorWheelGradient = forwardRef<HTMLSpanElement, ColorWheelGradientProps>(
  function ColorWheelGradient({ channelOverrides = { alpha: 1 }, style, children, ...props }, ref) {
    const ctx = useColorWheelContext();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const render = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas || !ctx.colorRef) return;
      let baseColor = ctx.colorRef;
      if (channelOverrides) {
        const updates: Record<string, number> = {};
        for (const [k, v] of Object.entries(channelOverrides)) {
          if (k === "alpha") baseColor = baseColor.set({ alpha: v });
          else updates[k] = v;
        }
        if (Object.keys(updates).length > 0) baseColor = baseColor.set({ mode: ctx.colorSpace, ...updates });
      }

      const angleCfg = getChannelConfig(ctx.colorSpace, ctx.angleChannelKey);
      const radiusCfg = getChannelConfig(ctx.colorSpace, ctx.radiusChannelKey);
      if (!angleCfg || !radiusCfg) return;

      const aMin = angleCfg.culoriMin ?? angleCfg.min;
      const aMax = angleCfg.culoriMax ?? angleCfg.max;
      const rMin = radiusCfg.culoriMin ?? radiusCfg.min;
      const rMax = radiusCfg.culoriMax ?? radiusCfg.max;

      const size = 128;
      const pixels = samplePolarGrid(
        baseColor, ctx.colorSpace,
        ctx.angleChannelKey, ctx.radiusChannelKey,
        aMin, aMax, rMin, rMax,
        size, size, ctx.startAngle,
      );
      renderToCanvas(canvas, pixels, size);
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
      <span ref={ref} data-disabled={ctx.disabled ? "" : undefined} style={style} {...props}>
        <canvas ref={canvasRef} style={{ position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none" }} />
        {children}
      </span>
    );
  },
);

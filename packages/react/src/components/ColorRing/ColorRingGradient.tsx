import { forwardRef, useCallback, useEffect, useRef, useMemo, type ComponentPropsWithoutRef } from "react";
import { Color } from "internationalized-color";
import { sampleConicRing, getChannelConfig } from "@urcolor/core";
import { useColorRingContext } from "./ColorRingContext";

export interface ColorRingGradientProps extends ComponentPropsWithoutRef<"span"> {
  channelOverrides?: Record<string, number> | false;
}

function renderToCanvas(canvas: HTMLCanvasElement, pixels: Uint8ClampedArray, sampleW: number, sampleH: number, innerR: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = typeof devicePixelRatio !== "undefined" ? devicePixelRatio : 1;
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const pixelData = new Uint8ClampedArray(pixels.buffer) as unknown as Uint8ClampedArray<ArrayBuffer>;
  const imageData = new ImageData(pixelData, sampleW, sampleH);
  const offscreen = new OffscreenCanvas(sampleW, sampleH);
  const offCtx = offscreen.getContext("2d");
  if (!offCtx) return;
  offCtx.putImageData(imageData, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const outerR = Math.min(cx, cy);
  const innerRPx = outerR * innerR;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.arc(cx, cy, innerRPx, 0, Math.PI * 2, true);
  ctx.clip("evenodd");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(offscreen, 0, 0, w, h);
  ctx.restore();
}

export const ColorRingGradient = forwardRef<HTMLSpanElement, ColorRingGradientProps>(
  function ColorRingGradient({ channelOverrides = { alpha: 1 }, style, children, ...props }, ref) {
    const rootCtx = useColorRingContext();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    function applyOverrides(baseColor: Color, cs: string): Color {
      if (!channelOverrides) return baseColor;
      let result = baseColor;
      const updates: Record<string, number> = {};
      for (const [k, v] of Object.entries(channelOverrides)) {
        if (k === "alpha") result = result.set({ alpha: v });
        else updates[k] = v;
      }
      if (Object.keys(updates).length > 0) result = result.set({ mode: cs, ...updates });
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
      const cMin = cfg.culoriMin ?? cfg.min;
      const cMax = cfg.culoriMax ?? cfg.max;
      const sampleSize = 128;
      const pixels = sampleConicRing(overriddenBase, rootCtx.colorSpace, rootCtx.channelKey, cMin, cMax, sampleSize, sampleSize, rootCtx.startAngle);
      renderToCanvas(canvas, pixels, sampleSize, sampleSize, rootCtx.innerRadius);
    }, [rootCtx.colorRef, rootCtx.colorSpace, rootCtx.channelKey, rootCtx.startAngle, rootCtx.innerRadius, rootCtx.isDragging, channelOverrides]);

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
      <span ref={ref} data-disabled={rootCtx.disabled ? "" : undefined} style={style} {...props}>
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none" }}
        />
        {children}
      </span>
    );
  },
);

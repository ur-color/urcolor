import { forwardRef, useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import { Color } from "internationalized-color";
import { sampleTriangleGrid, getChannelConfig } from "@urcolor/core";
import { useColorTriangleContext } from "./ColorTriangleContext";

export interface ColorTriangleGradientProps extends ComponentPropsWithoutRef<"span"> {
  channelOverrides?: Record<string, number> | false;
}

function applyOverrides(baseColor: Color, colorSpace: string, overrides: Record<string, number> | false | undefined): Color {
  if (!overrides) return baseColor;
  let result = baseColor;
  const channelUpdates: Record<string, number> = {};
  for (const [k, v] of Object.entries(overrides)) {
    if (k === "alpha") result = result.set({ alpha: v });
    else channelUpdates[k] = v;
  }
  if (Object.keys(channelUpdates).length > 0) {
    result = result.set({ mode: colorSpace, ...channelUpdates });
  }
  return result;
}

export const ColorTriangleGradient = forwardRef<HTMLSpanElement, ColorTriangleGradientProps>(
  function ColorTriangleGradient({ channelOverrides = { alpha: 1 }, style, children, ...props }, ref) {
    const ctx = useColorTriangleContext();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const clipPath = (() => {
      const [v0, v1, v2] = ctx.vertices;
      return `polygon(${v0.x * 100}% ${v0.y * 100}%, ${v1.x * 100}% ${v1.y * 100}%, ${v2.x * 100}% ${v2.y * 100}%)`;
    })();

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || ctx.isDragging) return;

      const ctxCanvas = canvas.getContext("2d");
      if (!ctxCanvas) return;

      const dpr = typeof devicePixelRatio !== "undefined" ? devicePixelRatio : 1;
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (w === 0 || h === 0) return;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      const baseColor = ctx.colorRef;
      if (!baseColor) return;

      const overriddenBase = applyOverrides(baseColor, ctx.colorSpace, channelOverrides);
      const xCfg = getChannelConfig(ctx.colorSpace, ctx.xChannelKey);
      const yCfg = getChannelConfig(ctx.colorSpace, ctx.yChannelKey);
      if (!xCfg || !yCfg) return;

      const [v0, v1, v2] = ctx.vertices;
      const sampleSize = 64;

      let zChannel: string | undefined;
      let zMinVal: number | undefined;
      let zMaxVal: number | undefined;
      if (ctx.isThreeChannel && ctx.zChannelKey) {
        const zCfg = getChannelConfig(ctx.colorSpace, ctx.zChannelKey);
        if (zCfg) {
          zChannel = ctx.zChannelKey;
          zMinVal = zCfg.culoriMin ?? zCfg.min;
          zMaxVal = zCfg.culoriMax ?? zCfg.max;
        }
      }

      const pixels = sampleTriangleGrid(
        overriddenBase, ctx.colorSpace,
        ctx.xChannelKey, ctx.yChannelKey,
        xCfg.culoriMin ?? xCfg.min, xCfg.culoriMax ?? xCfg.max,
        yCfg.culoriMin ?? yCfg.min, yCfg.culoriMax ?? yCfg.max,
        v0, v1, v2,
        sampleSize, sampleSize,
        false,
        zChannel, zMinVal, zMaxVal,
      );

      const pixelData = new Uint8ClampedArray(pixels.buffer) as unknown as Uint8ClampedArray<ArrayBuffer>;
      const imageData = new ImageData(pixelData, sampleSize, sampleSize);
      const offscreen = new OffscreenCanvas(sampleSize, sampleSize);
      const offCtx = offscreen.getContext("2d");
      if (!offCtx) return;
      offCtx.putImageData(imageData, 0, 0);
      ctxCanvas.clearRect(0, 0, w, h);
      ctxCanvas.imageSmoothingEnabled = true;
      ctxCanvas.imageSmoothingQuality = "high";
      ctxCanvas.drawImage(offscreen, 0, 0, w, h);
    });

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const observer = new ResizeObserver(() => {
        // Force re-render by dispatching a state change
        canvas.dispatchEvent(new Event("resize"));
      });
      observer.observe(canvas);
      return () => observer.disconnect();
    }, []);

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
      <span ref={ref} data-disabled={ctx.disabled ? "" : undefined} {...props}>
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: "0",
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            clipPath,
          }}
        />
        {children}
      </span>
    );
  },
);

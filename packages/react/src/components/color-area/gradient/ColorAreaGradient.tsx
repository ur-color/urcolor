import { forwardRef, useCallback, useEffect, useMemo, useRef, type ComponentPropsWithoutRef } from "react";
import { Color, type SpaceId } from "@urcolor/core";
import { cssAreaBilinear, cssAreaChannels, drawGradient, getChannelConfig, renderToCanvas, sampleBilinearGrid, sampleChannelGrid, type GradientRenderer } from "@urcolor/shared";
import { useColorAreaContext } from "../root/ColorAreaRootContext";
import { CHECKERBOARD_STYLE } from "../../../utils";
import { CssGradientLayers, resolveCssGradient } from "../../../cssGradient";

export interface ColorAreaGradientProps extends ComponentPropsWithoutRef<"span"> {
  topLeft?: string;
  topRight?: string;
  bottomLeft?: string;
  bottomRight?: string;
  interpolationSpace?: SpaceId;
  /**
   * Which painter to use.
   * - `"auto"` (default) - CSS when an exact recipe exists, canvas otherwise
   * - `"css"` - force CSS; falls back to the canvas with a dev warning if none exists
   * - `"canvas"` - force the canvas painter
   */
  renderer?: GradientRenderer;
  channelOverrides?: Record<string, number> | false;
}

export const ColorAreaGradient = forwardRef<HTMLSpanElement, ColorAreaGradientProps>(
  function ColorAreaGradient({ topLeft, topRight, bottomLeft, bottomRight, interpolationSpace, renderer = "auto", channelOverrides = { alpha: 1 }, style, children, ...props }, ref) {
    const rootCtx = useColorAreaContext();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const mirrorX = !rootCtx.isSlidingFromLeft;
    const mirrorY = !rootCtx.isSlidingFromTop;
    const xIsAlpha = rootCtx.xChannelKey === "alpha";
    const yIsAlpha = rootCtx.yChannelKey === "alpha";
    const hasAlphaAxis = xIsAlpha || yIsAlpha;

    const canvasOpacity = useMemo(() => {
      if (hasAlphaAxis) return 1;
      if (channelOverrides === false || (typeof channelOverrides === "object" && channelOverrides.alpha === undefined)) {
        return rootCtx.colorRef?.alpha ?? 1;
      }
      return 1;
    }, [hasAlphaAxis, channelOverrides, rootCtx.colorRef]);

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

    /**
     * The four corners in screen order, with the mirror swap the CPU path
     * applies. `hasAlphaAxis` decides whether the corners keep their own alpha,
     * matching the flag `drawGradient` and `sampleBilinearGrid` are handed.
     */
    function orientedCorners(): [Color, Color, Color, Color] | null {
      const parsed = [topLeft, topRight, bottomLeft, bottomRight].map(c => Color.parse(c ?? "black"));
      if (parsed.some(c => !c)) return null;

      let [a, b, c, d] = parsed as [Color, Color, Color, Color];
      if (!hasAlphaAxis) [a, b, c, d] = [a.withAlpha(1), b.withAlpha(1), c.withAlpha(1), d.withAlpha(1)];
      if (!rootCtx.isSlidingFromLeft) [a, b, c, d] = [b, a, d, c];
      if (!rootCtx.isSlidingFromTop) [a, b, c, d] = [c, d, a, b];
      return [a, b, c, d];
    }

    const cssLayers = resolveCssGradient(renderer, "ColorAreaGradient", () => {
      if (topLeft || topRight || bottomLeft || bottomRight) {
        // `interpolationSpace` stays on the canvas. The two row gradients could
        // be densified into stops in that space, but the vertical lerp is a sRGB
        // alpha composite either way - the result would be perceptual on one
        // axis and not the other, which is worse than not taking this path.
        if (interpolationSpace) return null;
        const corners = orientedCorners();
        return corners && cssAreaBilinear(...corners);
      }

      if (!rootCtx.colorRef || !rootCtx.colorSpace) return null;
      return cssAreaChannels(
        applyOverrides(rootCtx.colorRef, rootCtx.colorSpace),
        rootCtx.colorSpace,
        xIsAlpha ? null : rootCtx.xChannelKey,
        yIsAlpha ? null : rootCtx.yChannelKey,
        rootCtx.isSlidingFromLeft,
        rootCtx.isSlidingFromTop,
      );
    });

    const render = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const slidingFromLeft = rootCtx.isSlidingFromLeft;
      const slidingFromTop = rootCtx.isSlidingFromTop;
      const cs = rootCtx.colorSpace;
      const xChannel = rootCtx.xChannelKey;
      const yChannel = rootCtx.yChannelKey;
      const baseColorObj = rootCtx.colorRef;

      if (topLeft || topRight || bottomLeft || bottomRight) {
        const tl = Color.parse(topLeft ?? "black");
        const tr = Color.parse(topRight ?? "black");
        const bl = Color.parse(bottomLeft ?? "black");
        const br = Color.parse(bottomRight ?? "black");
        if (!tl || !tr || !bl || !br) return;

        if (interpolationSpace) {
          let [a, b, c, d] = [tl, tr, bl, br];
          if (!slidingFromLeft) [a, b, c, d] = [b, a, d, c];
          if (!slidingFromTop) [a, b, c, d] = [c, d, a, b];
          const pixels = sampleBilinearGrid(a, b, c, d, 64, 64, interpolationSpace, hasAlphaAxis);
          renderToCanvas({ canvas, pixels, sampleWidth: 64, sampleHeight: 64 });
        } else {
          drawGradient(canvas, tl, tr, bl, br, hasAlphaAxis, mirrorX, mirrorY);
        }
        return;
      }

      if (baseColorObj && cs) {
        const overriddenBase = applyOverrides(baseColorObj, cs);
        const effectiveXChannel = xIsAlpha ? null : xChannel;
        const effectiveYChannel = yIsAlpha ? null : yChannel;
        const realChannel = effectiveXChannel ?? effectiveYChannel;
        if (!realChannel) return;

        if (effectiveXChannel && effectiveYChannel) {
          const xCfg = getChannelConfig(cs, effectiveXChannel);
          const yCfg = getChannelConfig(cs, effectiveYChannel);
          if (!xCfg || !yCfg) return;
          const xMin = xCfg.nativeMin ?? xCfg.min;
          const xMax = xCfg.nativeMax ?? xCfg.max;
          const yMin = yCfg.nativeMin ?? yCfg.min;
          const yMax = yCfg.nativeMax ?? yCfg.max;
          const pixels = sampleChannelGrid(
            overriddenBase, cs,
            effectiveXChannel, effectiveYChannel,
            slidingFromLeft ? xMin : xMax, slidingFromLeft ? xMax : xMin,
            slidingFromTop ? yMin : yMax, slidingFromTop ? yMax : yMin,
            64, 64, hasAlphaAxis,
          );
          renderToCanvas({ canvas, pixels, sampleWidth: 64, sampleHeight: 64 });
        } else {
          const channelKey = effectiveXChannel ?? effectiveYChannel!;
          const cfg = getChannelConfig(cs, channelKey);
          if (!cfg) return;
          const cMin = cfg.nativeMin ?? cfg.min;
          const cMax = cfg.nativeMax ?? cfg.max;
          const isXReal = !!effectiveXChannel;
          const slidingForwardReal = isXReal ? slidingFromLeft : slidingFromTop;
          const slidingForwardAlpha = isXReal ? slidingFromTop : slidingFromLeft;
          const realMin = slidingForwardReal ? cMin : cMax;
          const realMax = slidingForwardReal ? cMax : cMin;
          const alphaMin = slidingForwardAlpha ? 0 : 1;
          const alphaMax = slidingForwardAlpha ? 1 : 0;
          const data = new Uint8ClampedArray(64 * 64 * 4);
          for (let y = 0; y < 64; y++) {
            const vy = y / 63;
            for (let x = 0; x < 64; x++) {
              const vx = x / 63;
              const realVal = isXReal ? realMin + vx * (realMax - realMin) : realMin + vy * (realMax - realMin);
              const alphaVal = isXReal ? alphaMin + vy * (alphaMax - alphaMin) : alphaMin + vx * (alphaMax - alphaMin);
              const c = overriddenBase.with({ space: cs, [channelKey]: realVal });
              const rgb = c.to("srgb");
              const idx = (y * 64 + x) * 4;
              data[idx] = Math.round(Math.max(0, Math.min(1, rgb.get("r"))) * 255);
              data[idx + 1] = Math.round(Math.max(0, Math.min(1, rgb.get("g"))) * 255);
              data[idx + 2] = Math.round(Math.max(0, Math.min(1, rgb.get("b"))) * 255);
              data[idx + 3] = Math.round(Math.max(0, Math.min(1, alphaVal)) * 255);
            }
          }
          renderToCanvas({ canvas, pixels: data, sampleWidth: 64, sampleHeight: 64 });
        }
      }
    }, [rootCtx.isSlidingFromLeft, rootCtx.isSlidingFromTop, rootCtx.colorSpace, rootCtx.xChannelKey, rootCtx.yChannelKey, rootCtx.colorRef, rootCtx.isDragging, topLeft, topRight, bottomLeft, bottomRight, interpolationSpace, channelOverrides, mirrorX, mirrorY, hasAlphaAxis, xIsAlpha, yIsAlpha]);

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
      <span ref={ref} data-disabled={rootCtx.disabled ? "" : undefined} style={{ ...CHECKERBOARD_STYLE, ...style }} {...props}>
        {cssLayers
          ? <CssGradientLayers layers={cssLayers} style={{ opacity: canvasOpacity }} />
          : (
              <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none", opacity: canvasOpacity }}
              />
            )}
        {children}
      </span>
    );
  },
);

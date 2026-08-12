import { forwardRef, useCallback, useEffect, useMemo, useRef, type ComponentPropsWithoutRef } from "react";
import type { SpaceId } from "@urcolor/core";
import {
  areaCssLayers,
  paintAreaSurface,
  surfaceOpacity,
  type AreaSurfaceOptions,
  type GradientRenderer,
  type SurfaceCorners,
} from "@urcolor/shared";
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

    const canvasOpacity = useMemo(
      () => (rootCtx.colorRef ? surfaceOpacity(rootCtx.colorRef, hasAlphaAxis, channelOverrides) : 1),
      [rootCtx.colorRef, hasAlphaAxis, channelOverrides],
    );

    /** The four corners, or undefined when the caller gave none. */
    const corners = useMemo<SurfaceCorners | undefined>(
      () => (topLeft || topRight || bottomLeft || bottomRight
        ? [topLeft ?? "black", topRight ?? "black", bottomLeft ?? "black", bottomRight ?? "black"]
        : undefined),
      [topLeft, topRight, bottomLeft, bottomRight],
    );

    /** Everything both painters read, in the shape `@urcolor/shared` takes. */
    const surface = useMemo<AreaSurfaceOptions | null>(
      () => (rootCtx.colorRef
        ? {
            color: rootCtx.colorRef,
            colorSpace: rootCtx.colorSpace,
            xChannel: rootCtx.xChannelKey,
            yChannel: rootCtx.yChannelKey,
            slidingFromLeft: rootCtx.isSlidingFromLeft,
            slidingFromTop: rootCtx.isSlidingFromTop,
            overrides: channelOverrides,
            corners,
            interpolationSpace,
          }
        : null),
      [
        rootCtx.colorRef, rootCtx.colorSpace, rootCtx.xChannelKey, rootCtx.yChannelKey,
        rootCtx.isSlidingFromLeft, rootCtx.isSlidingFromTop,
        channelOverrides, corners, interpolationSpace,
      ],
    );

    const cssLayers = resolveCssGradient(
      renderer,
      "ColorAreaGradient",
      () => (surface ? areaCssLayers(surface) : null),
    );

    const render = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas || !surface) return;
      paintAreaSurface({ ...surface, canvas });
    }, [surface]);

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

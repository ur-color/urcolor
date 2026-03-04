import { forwardRef, useCallback, useEffect, useMemo, useRef, type ComponentPropsWithoutRef } from "react";
import { Color } from "internationalized-color";
import { drawLinearGradient, interpolateStops, getChannelConfig } from "@urcolor/core";
import { useColorSliderContext } from "./ColorSliderContext";

export interface ColorSliderGradientProps extends ComponentPropsWithoutRef<"span"> {
  /** Array of color stops. When omitted, auto-computes from the slider's channel and current color. */
  colors?: string[];
  /** Rotation angle in degrees. When using vertical orientation, defaults to 90. */
  angle?: number;
  /** When set to a non-RGB color space, interpolates stops in that space for perceptual accuracy. */
  interpolationSpace?: string;
  /**
   * Lock specific channels to fixed values in the gradient.
   * - `{ alpha: 1 }` (default) - lock alpha to 1
   * - `false` - no overrides
   */
  channelOverrides?: Record<string, number> | false;
}

export const ColorSliderGradient = forwardRef<HTMLSpanElement, ColorSliderGradientProps>(
  function ColorSliderGradient({ colors: colorsProp, angle: angleProp, interpolationSpace, channelOverrides = { alpha: 1 }, style, children, ...props }, ref) {
    const { colorRef, channel, colorSpace, orientation, inverted } = useColorSliderContext();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const effectiveAngle = angleProp !== undefined ? angleProp : orientation === "vertical" ? 90 : 0;
    const effectiveMirrorX = orientation === "horizontal" && inverted;
    const effectiveMirrorY = orientation === "vertical" && inverted;
    const isAlphaChannel = channel === "alpha";

    const canvasOpacity = useMemo(() => {
      if (isAlphaChannel) return 1;
      if (channelOverrides === false || (channelOverrides && channelOverrides.alpha === undefined)) {
        return colorRef?.alpha ?? 1;
      }
      return 1;
    }, [isAlphaChannel, channelOverrides, colorRef]);

    const autoColors = useMemo<Color[] | null>(() => {
      if (colorsProp) return null;
      if (!colorRef) return null;

      const overrides = channelOverrides;

      if (isAlphaChannel) {
        let baseColor = colorRef;
        if (overrides && typeof overrides === "object") {
          const nonAlpha: Record<string, number> = {};
          for (const [k, v] of Object.entries(overrides)) {
            if (k !== "alpha") nonAlpha[k] = v;
          }
          if (Object.keys(nonAlpha).length > 0) {
            baseColor = colorRef.set({ mode: colorSpace, ...nonAlpha });
          }
        }
        return [baseColor.set({ alpha: 0 }), baseColor.set({ alpha: 1 })];
      }

      const cfg = getChannelConfig(colorSpace, channel);
      if (!cfg) return null;

      const steps = 12;
      const colors: Color[] = [];
      const cMin = cfg.culoriMin ?? cfg.min;
      const cMax = cfg.culoriMax ?? cfg.max;

      let baseColor = colorRef;
      if (overrides && typeof overrides === "object") {
        const channelOverridesForSet: Record<string, number> = {};
        for (const [k, v] of Object.entries(overrides)) {
          if (k !== "alpha") channelOverridesForSet[k] = v;
        }
        if (Object.keys(channelOverridesForSet).length > 0) {
          baseColor = colorRef.set({ mode: colorSpace, ...channelOverridesForSet });
        }
        if (overrides.alpha !== undefined) {
          baseColor = baseColor.set({ alpha: overrides.alpha });
        }
      }

      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const val = cMin + t * (cMax - cMin);
        const c = baseColor.set({ mode: colorSpace, [channel]: val });
        if (c) colors.push(c);
      }
      return colors;
    }, [colorsProp, colorRef, isAlphaChannel, channelOverrides, colorSpace, channel]);

    const render = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      let colors: Color[];

      if (colorsProp) {
        const parsed = colorsProp.map(c => Color.parse(c));
        if (parsed.some(c => !c) || parsed.length < 2) return;
        colors = parsed as Color[];
      } else if (autoColors) {
        colors = autoColors;
        if (colors.length < 2) return;
      } else {
        return;
      }

      const shouldMirror = effectiveMirrorX || effectiveMirrorY;
      if (shouldMirror) {
        colors = [...colors].reverse();
      }

      if (interpolationSpace) {
        const interpolated = interpolateStops(colors, 32, interpolationSpace);
        drawLinearGradient(canvas, interpolated, effectiveAngle, isAlphaChannel);
      } else {
        drawLinearGradient(canvas, colors, effectiveAngle, isAlphaChannel);
      }
    }, [colorsProp, autoColors, effectiveMirrorX, effectiveMirrorY, interpolationSpace, effectiveAngle, isAlphaChannel]);

    // ResizeObserver for canvas
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      render();

      const observer = new ResizeObserver(() => render());
      observer.observe(canvas);
      return () => observer.disconnect();
    }, [render]);

    // Cleanup WebGL context
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
      <span ref={ref} style={style} {...props}>
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: "0",
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            opacity: canvasOpacity,
          }}
        />
        {children}
      </span>
    );
  },
);

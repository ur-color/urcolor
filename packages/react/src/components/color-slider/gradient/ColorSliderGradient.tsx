import { forwardRef, useCallback, useEffect, useMemo, useRef, type ComponentPropsWithoutRef } from "react";
import { Color, type SpaceId } from "@urcolor/core";
import { cssLinearStops, defaultStepsFor, drawLinearGradient, getChannelConfig, interpolateStops, type GradientRenderer } from "@urcolor/shared";
import { useColorSliderContext } from "../root/ColorSliderRootContext";
import { CHECKERBOARD_STYLE } from "../../../utils";
import { CssGradientLayers, resolveCssGradient } from "../../../cssGradient";

export interface ColorSliderGradientProps extends ComponentPropsWithoutRef<"span"> {
  /** Array of color stops. When omitted, auto-computes from the slider's channel and current color. */
  colors?: string[];
  /** Rotation angle in degrees. When using vertical orientation, defaults to 90. */
  angle?: number;
  /** When set to a non-RGB color space, interpolates stops in that space for perceptual accuracy. */
  interpolationSpace?: SpaceId;
  /**
   * Which painter to use.
   * - `"auto"` (default) - CSS when an exact recipe exists, canvas otherwise
   * - `"css"` - force CSS; falls back to the canvas with a dev warning if none exists
   * - `"canvas"` - force the canvas painter
   */
  renderer?: GradientRenderer;
  /**
   * Lock specific channels to fixed values in the gradient.
   * - `{ alpha: 1 }` (default) - lock alpha to 1
   * - `false` - no overrides
   */
  channelOverrides?: Record<string, number> | false;
}

export const ColorSliderGradient = forwardRef<HTMLSpanElement, ColorSliderGradientProps>(
  function ColorSliderGradient({ colors: colorsProp, angle: angleProp, interpolationSpace, renderer = "auto", channelOverrides = { alpha: 1 }, style, children, ...props }, ref) {
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

    /**
     * The shader holds 16 uniform slots, so the WebGL path can never ask for
     * more than that. The CSS path has no such ceiling and asks for
     * `defaultStepsFor(...)` instead - 36 across a hue sweep, where banding
     * between sRGB-lerped stops is visible and 12 is not enough.
     */
    const WEBGL_STOPS = 12;

    const buildAutoColors = (steps: number): Color[] | null => {
      if (colorsProp) return null;
      if (!colorRef) return null;

      const overrides = channelOverrides;

      if (isAlphaChannel) {
        let baseColor = colorRef;
        if (overrides && typeof overrides === "object") {
          const nonAlpha: Record<string, number> = {};
          for (const [k, v] of Object.entries(overrides)) {
            if (k !== "alpha" && getChannelConfig(colorSpace, k)) nonAlpha[k] = v;
          }
          if (Object.keys(nonAlpha).length > 0) {
            baseColor = colorRef.with({ space: colorSpace, ...nonAlpha });
          }
        }
        return [baseColor.withAlpha(0), baseColor.withAlpha(1)];
      }

      const cfg = getChannelConfig(colorSpace, channel);
      if (!cfg) return null;

      const colors: Color[] = [];
      const cMin = cfg.nativeMin ?? cfg.min;
      const cMax = cfg.nativeMax ?? cfg.max;

      let baseColor = colorRef;
      if (overrides && typeof overrides === "object") {
        const channelOverridesForSet: Record<string, number> = {};
        for (const [k, v] of Object.entries(overrides)) {
          if (k !== "alpha" && getChannelConfig(colorSpace, k)) channelOverridesForSet[k] = v;
        }
        if (Object.keys(channelOverridesForSet).length > 0) {
          baseColor = colorRef.with({ space: colorSpace, ...channelOverridesForSet });
        }
        if (overrides.alpha !== undefined) {
          baseColor = baseColor.withAlpha(overrides.alpha);
        }
      }

      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const val = cMin + t * (cMax - cMin);
        const c = baseColor.with({ space: colorSpace, [channel]: val });
        colors.push(c);
      }
      return colors;
    };

    const autoColors = useMemo<Color[] | null>(
      () => buildAutoColors(WEBGL_STOPS),
      [colorsProp, colorRef, isAlphaChannel, channelOverrides, colorSpace, channel],
    );

    /**
     * The stop list both painters draw, differing only in how many stops they
     * can hold. Mirroring reverses the stops rather than flipping the gradient,
     * which is what the WebGL path has always done.
     */
    const resolveColors = (steps: number): Color[] | null => {
      let colors: Color[];

      if (colorsProp) {
        const parsed = colorsProp.map(c => Color.parse(c));
        if (parsed.some(c => !c) || parsed.length < 2) return null;
        colors = parsed as Color[];
      } else {
        const auto = buildAutoColors(steps);
        if (!auto || auto.length < 2) return null;
        colors = auto;
      }

      if (effectiveMirrorX || effectiveMirrorY) colors = [...colors].reverse();
      if (interpolationSpace) return interpolateStops(colors, 32, interpolationSpace);
      return colors;
    };

    /**
     * `interpolationSpace` does not force the canvas here: a 1D sweep is fully
     * expressible as stops, and `resolveColors` already densifies to 32 of them
     * computed in that space.
     */
    const cssLayers = resolveCssGradient(renderer, "ColorSliderGradient", () => {
      const colors = resolveColors(colorsProp ? WEBGL_STOPS : defaultStepsFor(colorSpace, channel));
      return colors && cssLinearStops(colors, effectiveAngle);
    });

    const render = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const colors = resolveColors(WEBGL_STOPS);
      if (!colors) return;
      drawLinearGradient(canvas, colors, effectiveAngle, isAlphaChannel);
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
      <span ref={ref} style={{ ...CHECKERBOARD_STYLE, ...style }} {...props}>
        {cssLayers
          ? <CssGradientLayers layers={cssLayers} style={{ opacity: canvasOpacity }} />
          : (
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
            )}
        {children}
      </span>
    );
  },
);

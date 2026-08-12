import { forwardRef, useCallback, useEffect, useMemo, useRef, type ComponentPropsWithoutRef } from "react";
import { type Color, type SpaceId } from "@urcolor/core";
import { cssLinearStops, defaultStepsFor, drawLinearGradient, gradientOpacity, sliderStops, SLIDER_CANVAS_STEPS, type GradientRenderer } from "@urcolor/shared";
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
    const isAlphaChannel = channel === "alpha";

    const canvasOpacity = useMemo(
      () => (colorRef ? gradientOpacity(colorRef, channel, channelOverrides) : 1),
      [colorRef, channel, channelOverrides],
    );

    /**
     * The stop list both painters draw, differing only in how many stops they
     * can hold: the shader has 16 uniform slots, so the WebGL path asks for
     * `SLIDER_CANVAS_STEPS`, while the CSS path has no ceiling and asks for
     * `defaultStepsFor(...)` instead - 36 across a hue sweep, where banding
     * between sRGB-lerped stops is visible and 12 is not enough.
     */
    const resolveColors = useCallback((steps: number): Color[] | null => {
      if (!colorRef) return null;
      return sliderStops({
        color: colorRef,
        colorSpace,
        channel,
        colors: colorsProp,
        channelOverrides,
        interpolationSpace,
        steps,
        mirrored: inverted,
      });
    }, [colorRef, colorSpace, channel, colorsProp, channelOverrides, interpolationSpace, inverted]);

    /**
     * `interpolationSpace` does not force the canvas here: a 1D sweep is fully
     * expressible as stops, and `resolveColors` already densifies to 32 of them
     * computed in that space.
     */
    const cssLayers = resolveCssGradient(renderer, "ColorSliderGradient", () => {
      const colors = resolveColors(colorsProp ? SLIDER_CANVAS_STEPS : defaultStepsFor(colorSpace, channel));
      return colors && cssLinearStops(colors, effectiveAngle);
    });

    const render = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const colors = resolveColors(SLIDER_CANVAS_STEPS);
      if (!colors) return;
      drawLinearGradient(canvas, colors, effectiveAngle, isAlphaChannel);
    }, [resolveColors, effectiveAngle, isAlphaChannel]);

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

import { forwardRef, useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import { paintTriangleSurface, type GradientRenderer } from "@urcolor/shared";
import { useColorTriangleContext } from "../root/ColorTriangleRootContext";
import { CHECKERBOARD_STYLE } from "../../../utils";
import { warnNoCssRecipe } from "../../../cssGradient";

export interface ColorTriangleGradientProps extends ComponentPropsWithoutRef<"span"> {
  /**
   * Which painter to use. A barycentric sweep has no CSS equivalent, so this
   * component always paints into a canvas - the prop exists for symmetry with
   * the other gradients, and `"css"` warns and falls back.
   */
  renderer?: GradientRenderer;
  channelOverrides?: Record<string, number> | false;
}

export const ColorTriangleGradient = forwardRef<HTMLSpanElement, ColorTriangleGradientProps>(
  function ColorTriangleGradient({ renderer = "auto", channelOverrides = { alpha: 1 }, style, children, ...props }, ref) {
    // A barycentric sweep has no CSS equivalent, so there is nothing to resolve -
    // only the same warning the other gradients emit when asked for the impossible.
    if (renderer === "css") warnNoCssRecipe("ColorTriangleGradient");

    const ctx = useColorTriangleContext();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Cut once, on the wrapper — it clips the canvas with it. Clipping the
    // canvas to the same polygon as well left a seam along the three edges:
    // each clip antialiases independently and the two partial coverages
    // multiply. `sampleTriangleGrid` clamps its barycentric coordinates, so the
    // canvas is coloured out to its corners and nothing translucent shows
    // through.
    const clipPath = (() => {
      const [v0, v1, v2] = ctx.vertices;
      return `polygon(${v0.x * 100}% ${v0.y * 100}%, ${v1.x * 100}% ${v1.y * 100}%, ${v2.x * 100}% ${v2.y * 100}%)`;
    })();

    useEffect(() => {
      const canvas = canvasRef.current;
      // Sampling a triangle is the most expensive of the five grids, and a drag
      // only moves the channels the surface already spans, so the pixels cannot
      // change while one is in flight.
      if (!canvas || ctx.isDragging || !ctx.colorRef) return;

      paintTriangleSurface({
        canvas,
        color: ctx.colorRef,
        colorSpace: ctx.colorSpace,
        xChannel: ctx.xChannelKey,
        yChannel: ctx.yChannelKey,
        zChannel: ctx.isThreeChannel ? ctx.zChannelKey : undefined,
        vertices: ctx.vertices,
        overrides: channelOverrides,
      });
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
      <span ref={ref} data-disabled={ctx.disabled ? "" : undefined} style={{ ...CHECKERBOARD_STYLE, clipPath, ...style }} {...props}>
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: "0",
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        />
        {children}
      </span>
    );
  },
);

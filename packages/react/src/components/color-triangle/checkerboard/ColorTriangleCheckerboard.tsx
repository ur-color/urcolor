import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { warnCheckerboardDeprecated } from "../../../utils";

/**
 * @deprecated Deprecated. The Gradient component now paints the checkerboard itself, so
 * this component is no longer needed.
 */
export interface ColorTriangleCheckerboardProps extends ComponentPropsWithoutRef<"div"> {}

/** @deprecated The Gradient component now paints the checkerboard itself; remove this component. */
export const ColorTriangleCheckerboard = forwardRef<HTMLDivElement, ColorTriangleCheckerboardProps>(
  function ColorTriangleCheckerboard({ style, ...props }, ref) {
    warnCheckerboardDeprecated();
    return (
      <div
        ref={ref}
        style={{
          position: "absolute",
          inset: "0",
          pointerEvents: "none",
          background: "repeating-conic-gradient(rgb(230, 230, 230) 0% 25%, white 0% 50%) 0% 50% / 16px 16px",
          ...style,
        }}
        {...props}
      />
    );
  },
);

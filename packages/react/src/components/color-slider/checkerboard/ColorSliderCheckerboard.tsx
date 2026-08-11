import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { CHECKERBOARD_STYLE } from "@urcolor/shared";
import { warnCheckerboardDeprecated } from "../../../utils";

/**
 * @deprecated Deprecated. The Gradient component now paints the checkerboard itself, so
 * this component is no longer needed.
 */
export interface ColorSliderCheckerboardProps extends ComponentPropsWithoutRef<"div"> {}

/** @deprecated The Gradient component now paints the checkerboard itself; remove this component. */
export const ColorSliderCheckerboard = forwardRef<HTMLDivElement, ColorSliderCheckerboardProps>(
  function ColorSliderCheckerboard({ style, ...props }, ref) {
    warnCheckerboardDeprecated();
    return (
      <div
        ref={ref}
        style={{
          position: "absolute",
          inset: "0",
          pointerEvents: "none",
          ...CHECKERBOARD_STYLE,
          ...style,
        }}
        {...props}
      />
    );
  },
);

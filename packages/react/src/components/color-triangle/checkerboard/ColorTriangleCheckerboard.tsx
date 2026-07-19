import { forwardRef, type ComponentPropsWithoutRef } from "react";

export interface ColorTriangleCheckerboardProps extends ComponentPropsWithoutRef<"div"> {}

export const ColorTriangleCheckerboard = forwardRef<HTMLDivElement, ColorTriangleCheckerboardProps>(
  function ColorTriangleCheckerboard({ style, ...props }, ref) {
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

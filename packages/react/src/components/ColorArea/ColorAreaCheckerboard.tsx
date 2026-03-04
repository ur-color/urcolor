import { forwardRef, type ComponentPropsWithoutRef } from "react";

export interface ColorAreaCheckerboardProps extends ComponentPropsWithoutRef<"div"> {}

export const ColorAreaCheckerboard = forwardRef<HTMLDivElement, ColorAreaCheckerboardProps>(
  function ColorAreaCheckerboard({ style, ...props }, ref) {
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

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { useColorRingContext } from "./ColorRingContext";

export interface ColorRingTrackProps extends ComponentPropsWithoutRef<"div"> {}

export const ColorRingTrack = forwardRef<HTMLDivElement, ColorRingTrackProps>(
  function ColorRingTrack({ children, ...props }, ref) {
    const ctx = useColorRingContext();
    return (
      <div ref={ref} data-disabled={ctx.disabled ? "" : undefined} {...props}>
        {children}
      </div>
    );
  },
);

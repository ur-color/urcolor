import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { useColorAreaContext } from "./ColorAreaContext";

export interface ColorAreaTrackProps extends ComponentPropsWithoutRef<"div"> {}

export const ColorAreaTrack = forwardRef<HTMLDivElement, ColorAreaTrackProps>(
  function ColorAreaTrack({ children, ...props }, ref) {
    const ctx = useColorAreaContext();
    return (
      <div ref={ref} data-disabled={ctx.disabled ? "" : undefined} {...props}>
        {children}
      </div>
    );
  },
);

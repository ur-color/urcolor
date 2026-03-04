import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { useColorAreaContext } from "./ColorAreaContext";

export interface ColorAreaTrackProps extends ComponentPropsWithoutRef<"span"> {}

export const ColorAreaTrack = forwardRef<HTMLSpanElement, ColorAreaTrackProps>(
  function ColorAreaTrack({ children, ...props }, ref) {
    const ctx = useColorAreaContext();
    return (
      <span ref={ref} data-disabled={ctx.disabled ? "" : undefined} {...props}>
        {children}
      </span>
    );
  },
);

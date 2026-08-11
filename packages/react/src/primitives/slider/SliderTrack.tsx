import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { DATA_DISABLED, DATA_ORIENTATION } from "@urcolor/shared";
import { useSliderContext } from "./SliderContext";

export interface SliderTrackProps extends ComponentPropsWithoutRef<"div"> {}

/** The rail. Carries data attributes and nothing else. */
export const SliderTrack = forwardRef<HTMLDivElement, SliderTrackProps>(
  function SliderTrack({ children, ...rest }, ref) {
    const { state } = useSliderContext();
    return (
      <div
        ref={ref}
        {...{ [DATA_ORIENTATION]: state.orientation }}
        {...(state.disabled ? { [DATA_DISABLED]: "" } : {})}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

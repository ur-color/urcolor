import { forwardRef, type ComponentPropsWithoutRef, type CSSProperties } from "react";
import { clamp, DATA_DISABLED, DATA_ORIENTATION, positionFromValue } from "@urcolor/shared";
import { useSliderContext } from "./SliderContext";

export interface SliderIndicatorProps extends ComponentPropsWithoutRef<"div"> {}

/** The filled share of the track, measured from the minimum end. */
export const SliderIndicator = forwardRef<HTMLDivElement, SliderIndicatorProps>(
  function SliderIndicator({ style, children, ...rest }, ref) {
    const { state } = useSliderContext();
    const fraction = state.max === state.min
      ? 0
      : clamp((state.value - state.min) / (state.max - state.min), 0, 1);
    /**
     * Whether the minimum sits at the track's CSS start edge. Asking the
     * primitive where `min` renders keeps `dir`, `inverted` and vertical
     * flipping in one place instead of re-deriving them here.
     */
    const fillsFromStart = positionFromValue({ ...state, value: state.min }) === 0;

    const layout: CSSProperties = state.orientation === "vertical"
      ? { position: "absolute", left: 0, right: 0, height: `${fraction * 100}%`, ...(fillsFromStart ? { top: 0 } : { bottom: 0 }) }
      : { position: "absolute", top: 0, bottom: 0, width: `${fraction * 100}%`, ...(fillsFromStart ? { left: 0 } : { right: 0 }) };

    return (
      <div
        ref={ref}
        // The caller's declarations come last so they win the cascade.
        style={{ ...layout, ...style }}
        {...{ [DATA_ORIENTATION]: state.orientation }}
        {...(state.disabled ? { [DATA_DISABLED]: "" } : {})}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

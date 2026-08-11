import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { Slider } from "../../../primitives/slider";

export interface ColorSliderRangeProps extends ComponentPropsWithoutRef<"div"> {}

export const ColorSliderRange = forwardRef<HTMLDivElement, ColorSliderRangeProps>(
  function ColorSliderRange(props, ref) {
    return <Slider.Indicator ref={ref} {...props} />;
  },
);

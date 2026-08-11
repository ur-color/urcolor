import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { Slider } from "../../../primitives/slider";

export interface ColorSliderThumbProps extends ComponentPropsWithoutRef<"div"> {}

export const ColorSliderThumb = forwardRef<HTMLDivElement, ColorSliderThumbProps>(
  function ColorSliderThumb(props, ref) {
    return <Slider.Thumb ref={ref} {...props} />;
  },
);

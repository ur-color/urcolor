import { forwardRef } from "react";
import { ColorSwatch, type ColorSwatchProps } from "../../color-swatch/ColorSwatch";

export interface ColorFieldSwatchProps extends ColorSwatchProps {}

export const ColorFieldSwatch = forwardRef<HTMLDivElement, ColorFieldSwatchProps>(
  function ColorFieldSwatch(props, ref) {
    return <ColorSwatch ref={ref} as="span" {...props} />;
  },
);

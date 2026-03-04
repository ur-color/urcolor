import { forwardRef } from "react";
import { ColorSwatchRoot, type ColorSwatchRootProps } from "../ColorSwatch/ColorSwatchRoot";

export interface ColorFieldSwatchProps extends ColorSwatchRootProps {}

export const ColorFieldSwatch = forwardRef<HTMLDivElement, ColorFieldSwatchProps>(
  function ColorFieldSwatch(props, ref) {
    return <ColorSwatchRoot ref={ref} as="span" {...props} />;
  },
);

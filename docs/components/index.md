# Components

urcolor provides a set of unstyled, accessible color picker primitives for Vue. Each component is fully composable and supports any color space.

## Interactive Preview

See all components working together in the [full preview](/components/vue/preview).

## Available Components

### [ColorArea](/components/vue/color-area)

A 2D slider for selecting values across two axes — ideal for picking saturation and lightness, or any two-channel combination.

### [ColorSlider](/components/vue/color-slider)

A 1D slider for adjusting a single color channel, with a gradient track that reflects the current color. Supports horizontal and vertical orientations.

### [ColorField](/components/vue/color-field)

A numeric input for editing individual color channels, with optional increment/decrement buttons. Supports hex, degree, percentage, and numeric formats.

### ColorSwatch

A color preview element that displays a color with an optional checkerboard background for visualizing alpha transparency.

All components support alpha channel — use `channel="alpha"` on sliders and fields, or the `alpha` prop on ColorArea, ColorSlider, and ColorSwatch to reflect opacity. Pair with `Checkerboard` sub-components to visualize transparency.

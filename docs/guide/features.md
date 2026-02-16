# Features

## 74 Languages {#languages}

urcolor ships with full internationalization support powered by the [`internationalized-color`](https://github.com/GrandMagus02/internationalized-color) package from Adobe's React Spectrum ecosystem. Color channel labels, formatting, and parsing adapt automatically to the user's locale.

Supported locales include: Arabic (UAE), Bulgarian, Chinese (Simplified & Traditional), Croatian, Czech, Danish, Dutch, English (GB & US), Estonian, Finnish, French (Canada & France), German, Greek, Hebrew, Hungarian, Italian, Japanese, Korean, Latvian, Lithuanian, Norwegian, Polish, Portuguese (Portugal & Brazil), Romanian, Russian, Serbian, Slovakian, Slovenian, Spanish, Swedish, Turkish, Ukrainian, and more.

The locale is detected automatically from the browser, or can be set explicitly. All built-in strings — channel names, color format labels, and accessibility descriptions — are translated out of the box.

## Accessible {#accessible}

Accessibility is a first-class concern. urcolor's accessibility implementation is inspired by [React Spectrum](https://react-spectrum.adobe.com/react-aria/ColorArea.html) from Adobe — the industry reference for accessible color picker components.

Every component follows the WAI-ARIA color picker pattern with:

- Full keyboard navigation (arrow keys, Page Up/Down, Home/End)
- Screen reader announcements for color value changes
- Proper ARIA roles, labels, and live regions
- Focus management and visible focus indicators

## Multi-Framework {#multi-framework}

urcolor is designed as a universal color picker library with a shared core.

::: warning
Only **Vue 3** is supported at this time. React, Svelte, Angular, and Solid adapters are planned for future releases. The core logic for color conversion, WebGL rendering, and accessibility will be shared across all framework bindings.
:::

## Unstyled {#unstyled}

Every component is headless and renderless — zero default styles are included. The component design follows the patterns established by [Reka UI](https://reka-ui.com/) (Vue) and [Base UI](https://base-ui.com/) (React): low-level primitives that expose all state and behavior through props, slots, and data attributes while leaving visual design entirely to you.

This means urcolor fits into any UI, whether you use Tailwind, plain CSS, a component library, or a completely custom design system.

## Fast {#fast}

Color area gradients are rendered via **WebGL** directly on the GPU. This is critical for color spaces like OKLab, Lab, LCH, and OKLCH where gradients cannot be accurately represented with CSS `linear-gradient` — each pixel needs to be calculated individually in the correct color space. WebGL makes this possible at full resolution with smooth, jank-free performance.

The runtime has zero external dependencies beyond the core color math, keeping bundle size small.

## Any Color Space {#color-spaces}

Under the hood, urcolor uses [Culori](https://culorijs.org/) for color conversion and manipulation. Culori supports a wide range of color spaces:

| Color Space | Mode | CSS Color 4 |
| --- | --- | --- |
| sRGB | `rgb` | :white_check_mark: |
| Linear sRGB | `lrgb` | |
| HSL | `hsl` | :white_check_mark: |
| HSV / HSB | `hsv` | |
| HSI | `hsi` | |
| HWB | `hwb` | :white_check_mark: |
| CIELAB (D50) | `lab` | :white_check_mark: |
| CIELAB (D65) | `lab65` | |
| CIELCh (D50) | `lch` | :white_check_mark: |
| CIELCh (D65) | `lch65` | |
| OKLab | `oklab` | :white_check_mark: |
| OKLCH | `oklch` | :white_check_mark: |
| Display P3 | `p3` | :white_check_mark: |
| Adobe RGB 1998 | `a98` | :white_check_mark: |
| ProPhoto RGB | `prophoto` | :white_check_mark: |
| Rec. 2020 | `rec2020` | :white_check_mark: |
| CIE XYZ (D50) | `xyz50` | :white_check_mark: |
| CIE XYZ (D65) | `xyz65` | :white_check_mark: |
| CIELUV | `luv` | |
| CIELCh(uv) | `lchuv` | |
| DIN99o (Cartesian) | `dlab` | |
| DIN99o (Cylindrical) | `dlch` | |
| Jzazbz | `jab` | |
| JzCzhz | `jch` | |
| ICtCp | `itp` | |
| OKHsl | `okhsl` | |
| OKHsv | `okhsv` | |
| Cubehelix | `cubehelix` | |
| YIQ | `yiq` | |

# Features

## Internationalized {#languages}

UrColor ships with full internationalization support for 74 languages powered by the [`internationalized-color`](https://github.com/GrandMagus02/internationalized-color) package.

<details>
<summary>Full language list</summary>

| Code | Language | Code | Language |
|------|----------|------|----------|
| aa | 🇩🇯 Afar | na | 🇳🇷 Nauru |
| ab | 🇬🇪 Abkhazian | nb | 🇳🇴 Norwegian Bokmål |
| af | 🇿🇦 Afrikaans | ne | 🇳🇵 Nepali |
| ak | 🇬🇭 Akan | nl | 🇳🇱 Dutch |
| am | 🇪🇹 Amharic | nn | 🇳🇴 Norwegian Nynorsk |
| ar | 🇸🇦 Arabic | no | 🇳🇴 Norwegian |
| az | 🇦🇿 Azerbaijani | ny | 🇲🇼 Chichewa |
| bg | 🇧🇬 Bulgarian | oc | 🇫🇷 Occitan |
| bn | 🇧🇩 Bengali | pa | 🇮🇳 Punjabi |
| ca | 🇪🇸 Catalan | pl | 🇵🇱 Polish |
| cr | 🇨🇦 Cree | ps | 🇦🇫 Pashto |
| cs | 🇨🇿 Czech | pt | 🇵🇹 Portuguese |
| cy | 🏴󠁧󠁢󠁷󠁬󠁳󠁿 Welsh | ro | 🇷🇴 Romanian |
| da | 🇩🇰 Danish | ru | 🇷🇺 Russian |
| de | 🇩🇪 German | si | 🇱🇰 Sinhala |
| el | 🇬🇷 Greek | sk | 🇸🇰 Slovak |
| en | 🇬🇧 English | sl | 🇸🇮 Slovenian |
| es | 🇪🇸 Spanish | sm | 🇼🇸 Samoan |
| et | 🇪🇪 Estonian | so | 🇸🇴 Somali |
| fa | 🇮🇷 Persian | sq | 🇦🇱 Albanian |
| fi | 🇫🇮 Finnish | sr | 🇷🇸 Serbian |
| fr | 🇫🇷 French | su | 🇮🇩 Sundanese |
| ga | 🇮🇪 Irish | sv | 🇸🇪 Swedish |
| gu | 🇮🇳 Gujarati | ta | 🇮🇳 Tamil |
| he | 🇮🇱 Hebrew | te | 🇮🇳 Telugu |
| hi | 🇮🇳 Hindi | th | 🇹🇭 Thai |
| hr | 🇭🇷 Croatian | tl | 🇵🇭 Tagalog |
| hu | 🇭🇺 Hungarian | tr | 🇹🇷 Turkish |
| id | 🇮🇩 Indonesian | uk | 🇺🇦 Ukrainian |
| is | 🇮🇸 Icelandic | ur | 🇵🇰 Urdu |
| it | 🇮🇹 Italian | vi | 🇻🇳 Vietnamese |
| ja | 🇯🇵 Japanese | zh | 🇨🇳 Chinese |
| ka | 🇬🇪 Georgian | ja-traditional | 🇯🇵 Japanese wa-iro |
| kn | 🇮🇳 Kannada | zh-traditional | 🇨🇳 Chinese traditional |
| ko | 🇰🇷 Korean | ko-traditional | 🇰🇷 Korean obangsaek |
| lb | 🇱🇺 Luxembourgish | | |
| lt | 🇱🇹 Lithuanian | | |
| lv | 🇱🇻 Latvian | | |
| mk | 🇲🇰 Macedonian | | |
| ml | 🇮🇳 Malayalam | | |
| ms | 🇲🇾 Malay | | |
| my | 🇲🇲 Burmese | | |

</details>

The locale is detected automatically from the browser, or can be set explicitly. All built-in strings — channel names, color format labels, and accessibility descriptions — are translated out of the box.

::: warning
**Only color names are currently localized.**  
At this time, only color names are translated; channel abbreviations (such as `H`, `S`, `V`, `R`, `G`, `B`) and color format codes (like `hex`, `rgb`, `hsl`) remain untranslated in all locales.
:::


## Accessible {#accessible}

Accessibility is a first-class concern. UrColor's accessibility implementation is inspired by [React Spectrum](https://react-spectrum.adobe.com/react-aria/ColorArea.html) from Adobe — the industry reference for accessible color picker components.

Every component follows the WAI-ARIA color picker pattern with:

- Full keyboard navigation (arrow keys, Page Up/Down, Home/End)
- Screen reader announcements for color value changes
- Proper ARIA roles, labels, and live regions
- Focus management and visible focus indicators

## Multi-Framework {#multi-framework}

UrColor is designed as a universal color picker library with a shared core.

::: warning
Only **Vue 3** is supported at this time. React, Svelte, Angular, and Solid adapters are planned for future releases. The core logic for color conversion, WebGL rendering, and accessibility will be shared across all framework bindings.
:::

## Unstyled {#unstyled}

Every component is headless and renderless — zero default styles are included. The component design follows the patterns established by [Reka UI](https://reka-ui.com/) (Vue) and [Base UI](https://base-ui.com/) (React): low-level primitives that expose all state and behavior through props, slots, and data attributes while leaving visual design entirely to you.

This means UrColor fits into any UI, whether you use Tailwind, plain CSS, a component library, or a completely custom design system.

## Fast {#fast}

Color area gradients are rendered via **WebGL** directly on the GPU. This is critical for color spaces like OKLab, Lab, LCH, and OKLCH where gradients cannot be accurately represented with CSS `linear-gradient` — each pixel needs to be calculated individually in the correct color space. WebGL makes this possible at full resolution with smooth, jank-free performance.

The runtime has zero external dependencies beyond the core color math, keeping bundle size small.

## Any Color Space {#color-spaces}

Under the hood, UrColor uses [Culori](https://culorijs.org/) for color conversion and manipulation. Culori supports a wide range of color spaces:

<details>
<summary>Supported Color Spaces</summary>

| Color Space | Mode |
| --- | --- |
| sRGB | `rgb` |
| Linear sRGB | `lrgb` |
| HSL | `hsl` |
| HSV / HSB | `hsv` |
| HWB | `hwb` |
| CIELAB (D50) | `lab` |
| CIELAB (D65) | `lab65` |
| CIELCh (D50) | `lch` |
| CIELCh (D65) | `lch65` |
| OKLab | `oklab` |
| OKLCH | `oklch` |
| Display P3 | `p3` |
| Adobe RGB 1998 | `a98` |
| ProPhoto RGB | `prophoto` |
| Rec. 2020 | `rec2020` |
| CIE XYZ (D50) | `xyz50` |
| CIE XYZ (D65) | `xyz65` |

</details>

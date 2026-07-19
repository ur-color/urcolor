# Features

## Internationalized {#languages}

UrColor ships with channel-label translations for 74 languages, built into `@urcolor/core`'s `i18n` module (`translations` and `getChannelLabel`).

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

Channel labels — the words behind abbreviations like `H`, `S`, `L`, `V`, `R`, `G`, `B` (Hue, Saturation, Lightness, Value, Red, Green, Blue, and so on) — are what's translated. Call `getChannelLabel(locale, channelName)` to look up a label for a given locale, or use the `translations` map directly if you need the full dictionary for a locale.

::: warning
**Only channel labels are localized.** Color format codes (like `hex`, `srgb`, `hsl`) and numeric values are not translated.
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

Under the hood, UrColor uses its own zero-dependency, spec-accurate CSS Color 4 implementation for color conversion and manipulation. It supports a wide range of color spaces, identified with their CSS Color 4 ids:

<details>
<summary>Supported Color Spaces</summary>

| Color Space | Id |
| --- | --- |
| sRGB | `srgb` |
| Linear sRGB | `srgb-linear` |
| HSL | `hsl` |
| HSV / HSB | `hsv` |
| HWB | `hwb` |
| CIELAB | `lab` |
| CIELCh | `lch` |
| OKLab | `oklab` |
| OKLCH | `oklch` |
| Display P3 | `display-p3` |
| Adobe RGB 1998 | `a98-rgb` |
| ProPhoto RGB | `prophoto-rgb` |
| Rec. 2020 | `rec2020` |
| CIE XYZ (D65) | `xyz-d65` |
| CIE XYZ (D50) | `xyz-d50` |

</details>

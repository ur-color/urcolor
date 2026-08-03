# Features

## Unstyled {#unstyled}

Every component is headless and renderless — zero default styles are included. The component design follows the patterns established by [Reka UI](https://reka-ui.com/) (Vue) and [Base UI](https://base-ui.com/) (React): low-level primitives that expose all state and behavior through props, slots, and data attributes while leaving visual design entirely to you.

Eight component families ship today in every binding — Vue, React, Svelte and
Angular — each split into parts you compose yourself:

| Family | Parts |
| --- | --- |
| Color Area | Root, Area (Vue), Gradient, Checkerboard (Vue, React), Thumb |
| Color Slider | Root, Track, Range, Control (React, Svelte, Angular), Gradient, Checkerboard (Vue, React), Thumb |
| Color Field | Root, Input, Increment, Decrement, Swatch |
| Color Swatch | Root |
| Color Swatch Picker (Vue) / Swatch Group | Root, Item, Item Swatch, Item Indicator (Vue); Root elsewhere |
| Color Wheel | Root, Gradient, Checkerboard (Vue, React), Thumb |
| Color Triangle | Root, Gradient, Checkerboard (Vue, React), Thumb |
| Color Ring | Root, Track, Gradient, Checkerboard (Vue, React), Thumb |

This means UrColor fits into any UI, whether you use Tailwind, plain CSS, a component library, or a completely custom design system.

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

## Accessible {#accessible}

Accessibility is a first-class concern. UrColor's accessibility implementation is inspired by [React Spectrum](https://react-spectrum.adobe.com/react-aria/ColorArea.html) from Adobe — the industry reference for accessible color picker components.

Every component follows the WAI-ARIA color picker pattern with:

- Full keyboard navigation (arrow keys, Page Up/Down, Home/End)
- Screen reader announcements for color value changes
- Proper ARIA roles, labels, and live regions
- Focus management and visible focus indicators

## Fast {#fast}

Color area gradients are rendered via **WebGL** directly on the GPU. This is critical for color spaces like OKLab, Lab, LCH, and OKLCH where gradients cannot be accurately represented with CSS `linear-gradient` — each pixel needs to be calculated individually in the correct color space. WebGL makes this possible at full resolution with smooth, jank-free performance.

The runtime has zero external dependencies beyond the core color math, keeping bundle size small.

## Multi-Framework {#multi-framework}

UrColor is a universal color picker library: one shared core, one component
model, one set of behaviours, exposed idiomatically per framework.

- **Vue 3** (v3.4+) — `@urcolor/vue`, built on [Reka UI](https://reka-ui.com/) primitives, with `v-model` and slot props.
- **React** (v18+) — `@urcolor/react`, namespaced components (`ColorArea.Root`) with `value` / `onValueChange`.
- **Svelte 5** (v5.29+) — `@urcolor/svelte`, components with `bind:value`, `child` snippets, and rune-based hooks (`useColor`, `useOKLCh`, …).
- **Angular** (v21.2+) — `@urcolor/angular`, standalone directives (`[urcColorAreaRoot]`) with `[(value)]` models, signal stores, and Signal Forms support via `[field]`.

Drag handling, keyboard maps, channel models and data attributes live once in
`@urcolor/primitives`; color conversion and WebGL rendering live once in
`@urcolor/core`. Each binding is a thin idiomatic layer over those two, so
behaviour and accessibility are identical across all four. A Solid adapter is
planned.

Every recipe under [How to](/how-to/build-color-area-picker) shows all four
frameworks side by side.

## Internationalized {#languages}

Internationalization lives in one optional package, `@urcolor/i18n` — nothing
in the core or the framework bindings depends on it.

It answers two separate questions. `ChannelNames` translates **channel labels**
into 77 languages, and `ColorNames` answers "what is this color called?" in up
to 298 languages, from two independently sourced datasets. Color naming has its
own page: [Color Naming](/guide/color-naming).

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

Channel labels — the words behind abbreviations like `H`, `S`, `L`, `V`, `R`, `G`, `B` (Hue, Saturation, Lightness, Value, Red, Green, Blue, and so on) — are what's translated. Construct a `ChannelNames` for a locale and call `of()`, or use the `translations` map directly if you need the full dictionary for a locale.

```ts
import { ChannelNames } from "@urcolor/i18n";

const channels = new ChannelNames("ko");
channels.of("hue"); // "색조"
channels.resolvedOptions(); // { locale: "ko" }
```

::: warning
**Only channel labels are localized.** Color format codes (like `hex`, `srgb`, `hsl`) and numeric values are not translated.
:::

# @urcolor/core

A zero-dependency CSS Color 4 engine: parse, convert, gamut-map, mix, compare
and serialize colors across 15 spaces.

This package is color math and nothing else. As of 2.0.0 the gradient renderer,
grid samplers, geometry helpers and per-channel space configuration live in
[`@urcolor/shared`](../shared) — see [Migrating from 1.x](#migrating-from-1x).

```sh
bun add @urcolor/core     # or: npm i @urcolor/core
```

`urcolor` is the same engine under an unscoped name. Install
[`urcolor`](../urcolor) if you want the color library on its own;
`@urcolor/core` is already present if you install any framework binding.

## Quick start

```ts
import { Color } from "@urcolor/core";

const brand = Color.parse("#3b82f6")!;   // null when the string is unparseable
const white = Color.parse("white")!;

brand.to("oklch").toString();                          // "oklch(0.62308 0.18801 259.8145)"
brand.mix(white, 0.25, { space: "oklab" }).toString(); // "oklab(0.71731 -0.02494 -0.13879)"
brand.contrast(white);                                 // 3.6779011537825332
brand.deltaE(white);                                   // 41.872148268824525
brand.with({ space: "hsl", h: 200 }).toString("hex");  // "#3bb8f6"
```

`Color` is immutable — every method returns a new instance, nothing mutates in
place.

## Color spaces

Fifteen spaces, all interconvertible through XYZ:

| Family | Spaces |
|--------|--------|
| RGB | `srgb`, `srgb-linear`, `display-p3`, `a98-rgb`, `prophoto-rgb`, `rec2020` |
| Cylindrical sRGB | `hsl`, `hsv`, `hwb` |
| Perceptual | `lab`, `lch`, `oklab`, `oklch` |
| Device-independent | `xyz-d65`, `xyz-d50` |

Space ids are the CSS Color 4 names. `SPACES` and `spaceDef(id)` expose the
registry — channel order, hue index and the XYZ transforms — for code that has
to work generically over spaces.

## The `Color` class

### Construction

```ts
Color.parse(input)                 // Color | null — hex, named, and every CSS notation
new Color("oklch", [0.62, 0.19, 260], 1)
```

`Color.parse()` returns `null` rather than throwing, so an unparseable string is
handled the same way as any other miss. `tryParse` and the standalone `parse`
are exported for callers that want the function form.

### Conversion and gamut

| Method | Result |
|--------|--------|
| `to(space)` | The same color in another space |
| `toGamut(dest = "srgb")` | Gamut-mapped into `dest` (CSS Color 4 OKLCh chroma reduction) |
| `inGamut(dest = "srgb")` | Whether it already fits |
| `toObject()` | `{ space, coords, alpha }` |
| `toString(format?)` | Serialized — the space's own notation by default, or `"hex"` / `"rgb"` / … |

### Channels

| Method | Result |
|--------|--------|
| `get(channel)` | One channel by name, in the space's native range |
| `with(patch)` | A copy with the named channels replaced — pass `space` to convert first, then set |
| `withAlpha(value)` | A copy with a new alpha |
| `coords` | A copy of the coordinate tuple |
| `space`, `alpha` | Readonly |

### Comparison

| Method | Result |
|--------|--------|
| `equals(other, epsilon = 1e-4)` | Coordinate equality within a tolerance |
| `deltaE(other, method?)` | Perceptual difference — CIE76, CIE94, CIEDE2000, or OK |
| `contrast(other, options?)` | WCAG 2.1 ratio, or APCA Lc with `{ algorithm: "apca" }` |

### Mixing and manipulation

| Method | Result |
|--------|--------|
| `mix(other, amount = 0.5, options?)` | Interpolate in any space, with a choice of hue path |
| `lighten(amount?)` / `darken(amount?)` | Lightness adjustment |
| `saturate(amount?)` / `desaturate(amount?)` | Chroma adjustment |
| `rotateHue(degrees)` | Hue rotation |
| `complement()` | 180° hue rotation |
| `negate()` | Channel-wise inversion |

## Standalone functions

Every method has a function behind it, exported for point-free and tree-shaken
use: `parse`, `tryParse`, `serialize`, `convert`, `gamutMap`, `inGamut`,
`interpolate`, `mix`, `deltaE`, `deltaEOK`, `contrast`, `alpha`, `complement`,
`darken`, `desaturate`, `lighten`, `negate`, `rotateHue`, `saturate`.

Also exported:

- `NAMED_COLORS`, `parseNamed` — the CSS named-color table
- `SPACES`, `spaceDef`, `hueIndexOf`, `channelIndexOf` — the space registry
- `NOTATIONS`, `parseChannelToken` — notation metadata and raw channel-token
  parsing, so a parser plugin can reuse core's unit and percent-reference rules
- `registerParser` — the extension point [`@urcolor/relative`](../relative)
  uses to add CSS Color 5 relative syntax

## Types

`ColorObject`, `Coords`, `SpaceDef`, `SpaceId`, `ColorFormat`, `ColorPatch`,
`ColorParser`, `HueMethod`, `InterpolateOptions`, `MixOptions`, `DeltaEMethod`,
`ContrastAlgorithm`, `ContrastOptions`, `NotationChannel`, `NotationDef`, and
the tagged aliases `ColorIn`, `OklchColor`, `P3Color`, `SrgbColor`.

## Performance

Benchmarked against culori, chroma-js, colorjs.io, colord and tinycolor2 on
every operation a picker performs, with
[the losses published alongside the wins](https://urcolor.vercel.app/guide/benchmarks).

```sh
bun run bench            # run the suite
bun run bench:report     # JSON output
```

## Migrating from 1.x

2.0.0 removed everything that was not color math. The names are unchanged — only
the package they come from:

```diff
-import { drawGradient, insetTriangle, colorSpaces } from "@urcolor/core";
+import { drawGradient, insetTriangle, colorSpaces } from "@urcolor/shared";
```

That covers the gradient renderer and samplers (`drawGradient`,
`drawLinearGradient`, `interpolateStops`, `sampleBilinearGrid`,
`sampleChannelGrid`, `sampleTriangleGrid`, `samplePolarGrid`,
`sampleConicRing`), the polar and triangle geometry helpers, and the
`colorSpaces` / `getChannelConfig` / `displayToNative` / `nativeToDisplay`
channel configuration. See [`CHANGELOG.md`](./CHANGELOG.md) for the full list.

## Documentation

- [Guide](https://urcolor.vercel.app/guide/) — installation, the `Color` class, color naming
- [Benchmarks](https://urcolor.vercel.app/guide/benchmarks)
- [Components](https://urcolor.vercel.app/components/)

## License

MIT

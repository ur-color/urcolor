# The Color Class

`Color` is the ergonomic heart of `@urcolor/core`: an **immutable, `Temporal`-shaped** object for parsing, converting, manipulating, comparing, and serialising colors. Every method returns a new `Color`, so a color value never changes underneath you.

```ts
import { Color } from "@urcolor/core";

const blue = Color.parse("#3b82f6")!;
const darker = blue.darken(0.1).to("oklch");

blue.toString(); // "#3b82f6" — unchanged
darker.toString("oklch"); // "oklch(0.55 0.21 258.4)"
```

Under the hood the class is a thin facade over a **pure, tree-shakeable functional core** (`parse`, `convert`, `serialize`, `mix`, `contrast`, …). Reach for the class when you want the fluent object; import the functions directly when you want the smallest possible bundle. See [Tree-shaking](#tree-shaking-the-functional-core) below.

## Construction

### `Color.parse(string)`

Parse any CSS Color 4 string, or get `null` when the string isn't a color. This is the nullable, non-throwing entry point.

```ts
Color.parse("rebeccapurple"); // Color
Color.parse("oklch(0.7 0.15 200)"); // Color
Color.parse("color(display-p3 1 0 0)"); // Color
Color.parse("not a color"); // null
```

### `Color.from(input)`

Build from a CSS string, a packed `0xRRGGBB` integer, a [`ColorObject`](#the-colorobject-form), or another `Color`. Unlike `parse`, it **throws** on an unrecognised string — use it when the input is trusted.

```ts
Color.from("tomato"); // from a string
Color.from(0x3b82f6); // from a packed integer
Color.from({ space: "oklch", coords: [0.7, 0.15, 200], alpha: 1 });
Color.from(existingColor); // returns it unchanged (already immutable)
```

### Channel constructors

Skip parsing entirely and build straight from channel values. RGB takes `0..255`; everywhere else channels are in the space's **native units** (hue in degrees, sRGB-family `s`/`l`/`w`/`b` in `0..1`, Lab lightness in `0..100`).

```ts
Color.fromRgb(59, 130, 246); // r,g,b in 0..255, optional alpha
Color.fromHex("#3b82f6"); // alias for Color.from(hex)
Color.fromHsl(210, 0.8, 0.5); // h in degrees, s/l in 0..1
Color.fromHwb(210, 0.1, 0.2);
Color.fromLab(55, 10, -60);
Color.fromLch(55, 61, 280);
Color.fromOklab(0.6, -0.02, -0.15);
Color.fromOklch(0.6, 0.15, 258);
Color.fromXyz(0.2, 0.15, 0.6);
```

Each accepts an optional trailing `alpha` (`0..1`, default `1`):

```ts
Color.fromRgb(59, 130, 246, 0.5); // 50% opaque
```

## Immutability

Methods that "change" a color return a **new** one; the original is never mutated. `space` and `alpha` are `readonly`, and the coordinate tuple is a private field no caller can reach.

```ts
const c = Color.parse("red")!;
const faded = c.withAlpha(0.5);

c.alpha; // 1 — untouched
faded.alpha; // 0.5
c === faded; // false
```

`coords` always hands back a **fresh copy**, so mutating it is harmless:

```ts
const coords = c.coords; // [1, 0, 0]
coords[0] = 0.5; // does NOT affect c
```

## Reading channels

| Member | Type | Description |
| --- | --- | --- |
| `.space` | `SpaceId` | The space of the stored coordinates. |
| `.alpha` | `number` | Alpha in `0..1`. |
| `.coords` | `[number, number, number]` | A fresh copy of the channel tuple in native units. |
| `.get(channel)` | `number` | Read one channel by name, resolved against the current space. |

```ts
const c = Color.fromOklch(0.6, 0.15, 258);

c.space; // "oklch"
c.coords; // [0.6, 0.15, 258]
c.get("l"); // 0.6
c.get("h"); // 258
c.get("s"); // RangeError — no "s" channel in oklch
```

## Conversion

### `.to(space)`

Convert to any [supported space](#color-spaces), returning a new `Color`. Conversions route through the XYZ-D65 hub (with a direct sRGB bridge for the sRGB family) and stay at **full precision** — nothing is clamped or quantised until you serialise.

```ts
const c = Color.parse("#3b82f6")!;

c.to("oklch"); // Color in oklch
c.to("hsl").get("h"); // hue in degrees
c.to("lab").to("srgb"); // round-trips losslessly in precision
```

### `.inGamut(dest?)` and `.toGamut(dest?)`

Check whether a color fits inside a destination gamut (default `srgb`), and map it in if it doesn't. `toGamut` uses Oklch chroma reduction and returns an Oklch `Color`.

```ts
const wide = Color.parse("oklch(0.7 0.4 30)")!; // out of sRGB

wide.inGamut(); // false
wide.inGamut("display-p3"); // maybe true
wide.toGamut(); // nearest in-gamut sRGB color (as oklch)
wide.toGamut("display-p3"); // mapped into P3 instead
```

### The `ColorObject` form

`.toObject()` returns the plain `{ space, coords, alpha }` value the functional core operates on — useful for passing into standalone functions or serialising your own way.

```ts
Color.parse("red")!.toObject();
// { space: "srgb", coords: [1, 0, 0], alpha: 1 }
```

## Updating channels

### `.with(patch)`

Copy the color with any subset of channels and/or `alpha` overridden. If the patch includes a `space`, the color is **converted into that space first** and the channel names resolve against it — a convert-and-set in one call.

```ts
const c = Color.parse("#3b82f6")!;

c.with({ alpha: 0.5 }); // just fade it
c.with({ space: "hsl", h: 120 }); // convert to HSL, then set hue to 120
c.with({ space: "oklch", l: 0.8, c: 0.05 }); // lighten + desaturate in Oklch

c.with({ space: "oklch", zzz: 1 }); // RangeError — no such channel
```

### `.withAlpha(value)`

Shorthand for setting opacity only, keeping the space and coordinates.

```ts
Color.parse("red")!.withAlpha(0.25);
```

## Color spaces

Every method that takes a `SpaceId` accepts any of these:

| Family | Space ids |
| --- | --- |
| sRGB | `srgb`, `srgb-linear`, `hsl`, `hsv`, `hwb` |
| CIE Lab | `lab`, `lch` |
| Oklab | `oklab`, `oklch` |
| Wide-gamut RGB | `display-p3`, `a98-rgb`, `prophoto-rgb`, `rec2020` |
| CIE XYZ | `xyz-d65`, `xyz-d50` |

`hsv` is fully supported for construction and conversion, but has no CSS notation — serialising an `hsv` color falls back to `rgb()`.

## Manipulation

Convenience adjustments. Lightness, chroma, and hue changes happen in **Oklch** (perceptually even) and convert back to the color's own space; `negate` inverts sRGB channels. All return a new `Color`.

| Method | Default | Effect |
| --- | --- | --- |
| `.lighten(amount?)` | `0.1` | Add `amount` to Oklch lightness (clamped `0..1`). |
| `.darken(amount?)` | `0.1` | Subtract `amount` from Oklch lightness. |
| `.saturate(amount?)` | `0.1` | Scale Oklch chroma by `1 + amount`. |
| `.desaturate(amount?)` | `0.1` | Scale Oklch chroma by `1 - amount`. |
| `.rotateHue(degrees)` | — | Rotate the Oklch hue. |
| `.complement()` | — | Rotate the hue by 180°. |
| `.negate()` | — | Invert the sRGB channels (returns sRGB). |

```ts
const c = Color.parse("#3b82f6")!;

c.lighten(); // +0.1 lightness
c.darken(0.2); // -0.2 lightness
c.saturate(0.5); // +50% chroma
c.rotateHue(30); // shift the hue
c.complement(); // opposite hue
c.negate(); // photographic negative
```

## Mixing

`.mix(other, amount?, options?)` blends toward another color. `amount` runs `0` (all this color) → `1` (all `other`), default `0.5`. Interpolation happens in **Oklab** by default with premultiplied alpha; pass `space` and `hue` to control it.

```ts
const a = Color.parse("red")!;
const b = Color.parse("blue")!;

a.mix(b); // 50/50 in Oklab
a.mix(b, 0.25); // 25% of the way to blue
a.mix(b, 0.5, { space: "oklch", hue: "longer" }); // go the long way round the hue wheel
```

`hue` accepts `"shorter"` (default), `"longer"`, `"increasing"`, or `"decreasing"` for polar working spaces.

## Comparison & analysis

### `.equals(other, epsilon?)`

Structural equality, compared in this color's space within `epsilon` (default `1e-4`). Colors written differently but equal in value compare equal.

```ts
Color.parse("#ff0000")!.equals(Color.parse("red")!); // true
Color.parse("red")!.equals(Color.fromRgb(255, 0, 0)); // true
```

### `.deltaE(other, method?)`

Perceptual color difference. Method is `"2000"` (CIEDE2000, the default), `"76"` (CIE76), or `"ok"` (ΔEOK).

```ts
const a = Color.parse("#3b82f6")!;
const b = Color.parse("#2563eb")!;

a.deltaE(b); // small — visually close
a.deltaE(b, "ok"); // ΔEOK
```

### `.contrast(other, options?)`

Contrast against another color. Algorithm is `"wcag21"` (the WCAG 2.1 ratio, default) or `"apca"`.

```ts
const text = Color.parse("#1f2937")!;
const bg = Color.parse("white")!;

text.contrast(bg); // WCAG 2.1 ratio, e.g. 12.6
text.contrast(bg, { algorithm: "apca" }); // APCA Lc value
```

## Serialization

### `.toString(format?)`

With no format, the color is written in its **own space's** CSS notation. With a format, it is converted first, so any format works from any color. Pass `"hex"` for `#rrggbb[aa]`.

```ts
const c = Color.fromOklch(0.6, 0.15, 258);

c.toString(); // "oklch(0.6 0.15 258)"
c.toString("hex"); // "#3b82f6"
c.toString("srgb"); // "rgb(59 130 246)"
c.toString("hsl"); // "hsl(217 91% 60%)"
```

### `.toJSON()` and `.valueOf()`

`toJSON` returns the CSS string, so a color round-trips cleanly through JSON via `Color.from`:

```ts
const c = Color.parse("#3b82f6")!;
const json = JSON.stringify({ brand: c }); // { "brand": "#3b82f6" }
const back = Color.from(JSON.parse(json).brand); // Color again
```

Mirroring `Temporal.*`, `.valueOf()` **throws** — a color has no numeric coercion, so accidental arithmetic (`color + 1`) fails loudly instead of producing garbage.

## Tree-shaking: the functional core

The class pulls in the full space registry. When bundle size matters, the standalone functions do the same work and stay independently tree-shakeable:

```ts
import { parse, convert, serialize, mix, contrast } from "@urcolor/core";

const a = parse("red");
const b = parse("blue");
serialize(convert(mix(a, b), "oklch"), "oklch");
contrast(a, b); // WCAG 2.1
```

Everything the class does maps to a function: `Color.parse` → `parse`/`tryParse`, `.to` → `convert`, `.toString` → `serialize`, `.mix` → `mix`, `.deltaE` → `deltaE`, `.contrast` → `contrast`, `.lighten`/`.darken`/… → `lighten`/`darken`/…, `.toGamut`/`.inGamut` → `gamutMap`/`inGamut`.

::: tip
Use the `Color` class for application code where ergonomics win, and the raw functions inside hot paths or size-sensitive libraries. They share the same `ColorObject` representation, so mixing the two is seamless.
:::

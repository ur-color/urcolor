# @urcolor/shared

The framework-agnostic half of a color picker: everything
[`@urcolor/vue`](../vue), [`@urcolor/react`](../react),
[`@urcolor/svelte`](../svelte) and [`@urcolor/angular`](../angular) share, with
no framework of its own.

It is published so those packages can depend on it — not because applications
are expected to install it directly. Reach for it when you are writing a
binding for a framework urcolor does not cover, or rendering a gradient outside
the components.

```sh
bun add @urcolor/shared
```

Depends only on [`@urcolor/core`](../core).

> Renamed from `@urcolor/primitives` in 1.0.0, and gained the rendering and
> geometry surface that used to live in `@urcolor/core` — see
> [`CHANGELOG.md`](./CHANGELOG.md).

## What's in it

### Gradient rendering

WebGL, one draw call per surface, with a CPU sampler fallback for contexts
where WebGL is unavailable. The samplers return `Uint8ClampedArray` RGBA data
ready for `putImageData`.

```ts
import { Color } from "@urcolor/core";
import { drawGradient, drawLinearGradient, sampleChannelGrid, renderToCanvas } from "@urcolor/shared";

const c = (s: string) => Color.parse(s)!;

// Bilinear gradient across four corners — the backdrop of a 2D color area.
drawGradient(canvas, c("red"), c("yellow"), c("blue"), c("green"));

// Linear gradient, 2–16 stops — a slider track.
drawLinearGradient(canvas, ["red", "yellow", "green", "cyan", "blue"].map(c));

// CPU path: RGBA pixels for a grid varying two channels, then blit them.
const pixels = sampleChannelGrid(c("#3b82f6"), "hsl", "h", "s", 0, 360, 0, 100, w, h);
renderToCanvas({ canvas, pixels, sampleWidth: w, sampleHeight: h });
```

Every gradient function takes `Color` instances, not strings — parsing is the
caller's, so a hot render loop never re-parses. Channel arguments are the
space's own channel keys (`"h"`, `"s"`, `"l"`), matching `@urcolor/core`.

| Export | Renders |
|--------|---------|
| `drawGradient` | Bilinear four-corner gradient (WebGL) |
| `drawLinearGradient` | Linear gradient, 2–16 stops (WebGL) |
| `interpolateStops` | Interpolated stop list in a given space |
| `sampleBilinearGrid` | Four-corner bilinear RGBA grid |
| `sampleChannelGrid` | RGBA grid varying two channels of a base color |
| `sampleTriangleGrid` | Barycentric triangle |
| `samplePolarGrid` | Wheel — angle and radius |
| `sampleConicRing` | Ring — conic sweep between two radii |

### Geometry

The math wheels, rings and triangle pickers are laid out with:
`polarToCartesian`, `cartesianToPolar`, `clampToCircle`, `normalizeAngle`,
`triangleVertices`, `barycentricCoords`, `barycentricToCartesian`,
`pointInTriangle`, `clampToTriangle`, `insetTriangle`, plus the `Point` and
`PolarCoord` types.

### Color-space configuration

Per-channel display metadata — ranges, steps, formats, labels — and the mapping
between a channel's display value and the color model's native internal range.

```ts
import { colorSpaces, getChannelConfig, displayToNative, nativeToDisplay } from "@urcolor/shared";

colorSpaces.hsl;               // { space: "hsl", label: "HSL", channels: [...] }
getChannelConfig("hsl", "h");  // { key: "h", label: "Hue", min: 0, max: 360, step: 1, format: "degree" }
```

Twelve picker-facing spaces are configured here — HSL, HSV, HWB, OKLCh, OKLab,
LCh, Lab, sRGB, Display P3, A98 RGB, ProPhoto RGB and Rec. 2020, each with an
alpha channel. The linear and XYZ spaces `@urcolor/core` converts through have
no display configuration because no picker exposes them as channels.

`channel-model` builds on this with the pieces every root component needs:
`parseColor`, `resolveChannelConfig`, `colorToDisplayValue`, `applyDisplayValue`,
`applyDisplayValues`, and `ALPHA_CONFIG`.

### Interaction

| Module | Exports |
|--------|---------|
| `drag` | `createDragController`, `DragController` — pointer capture, drag state, and the coordinate math each root reuses |
| `slider` | `valueFromPosition`, `positionFromValue`, `valueFromKey`, `sliderAria` |
| `toggle` | `toggleAria`, `isToggleActivationKey`, `rovingIndexFromKey`, `rovingTabIndex` |
| `keys` | `ARROW_KEYS`, `PAGE_KEYS`, `resolveArrowKey`, `stepMultiplier` — arrow resolution with orientation, direction and inversion applied |

### Utilities

- `math` — `clamp`, `snapToStep`, `roundValue`, `getDecimalCount`, `linearScale`,
  `convertValueToPercentage`, `getThumbInBoundsOffset`, `getClosestThumbIndex`,
  `hasMinStepsBetweenValues`, `getLabel`
- `canvas` — `renderToCanvas`, `CHECKERBOARD_BACKGROUND`
- `labels` — `channelLabel`, `formatChannelValue`
- `data-attributes` — the `data-*` names the components emit for styling
  (`DATA_DISABLED`, `DATA_ORIENTATION`, `DATA_DRAGGING`, …)

## License

MIT

# @urcolor/core

Color space utilities and WebGL-accelerated gradient rendering for color picker components.

## Installation

```bash
bun add @urcolor/core
```

## Features

- **WebGL Gradient Rendering** — GPU-accelerated bilinear and linear gradients on canvas
- **12 Color Spaces** — HSL, HSV, HWB, OKLCh, OKLab, LCh, Lab, RGB, Display P3, A98 RGB, ProPhoto RGB, Rec. 2020
- **Channel Configuration** — Standardized metadata for color channels (ranges, steps, formats)
- **Display/Internal Conversion** — Automatic mapping between display values and culori internals

## Usage

### Gradient Rendering

```ts
import { drawGradient, drawLinearGradient } from '@urcolor/core'

// Bilinear gradient on a canvas (e.g. for a 2D color area)
drawGradient(canvas, 'red', 'yellow', 'blue', 'green')

// Linear gradient with multiple color stops
drawLinearGradient(canvas, ['red', 'yellow', 'green', 'cyan', 'blue'])
```

### Color Space Configuration

```ts
import { colorSpaces, getChannelConfig } from '@urcolor/core'

// Get all channels for HSL
const hsl = colorSpaces.hsl
// => { mode: 'hsl', label: 'HSL', channels: [...] }

// Get config for a specific channel
const hue = getChannelConfig('hsl', 'hue')
// => { key: 'hue', label: 'Hue', min: 0, max: 360, step: 1, format: 'degree' }
```

### Sampling

```ts
import { sampleChannelGrid, sampleBilinearGrid } from '@urcolor/core'

// Sample a 2D grid varying two channels (ideal for color area backgrounds)
const pixels = sampleChannelGrid(baseColor, 'hsl', 'hue', 'saturation', 0, 360, 0, 100, width, height)

// Bilinear interpolation between four corner colors
const pixels = sampleBilinearGrid(topLeft, topRight, bottomLeft, bottomRight, width, height, 'oklch')
```

## Supported Color Spaces

| Space | Channels |
|-------|----------|
| HSL | Hue (0–360°), Saturation (0–100%), Lightness (0–100%) |
| HSV | Hue (0–360°), Saturation (0–100%), Value (0–100%) |
| HWB | Hue (0–360°), Whiteness (0–100%), Blackness (0–100%) |
| OKLCh | Lightness (0–100%), Chroma (0–0.4), Hue (0–360°) |
| OKLab | Lightness (0–100%), a (−0.4–0.4), b (−0.4–0.4) |
| LCh | Lightness (0–100%), Chroma (0–150), Hue (0–360°) |
| Lab | Lightness (0–100%), a (−125–125), b (−125–125) |
| RGB | Red (0–255), Green (0–255), Blue (0–255) |
| Display P3 | Red (0–1), Green (0–1), Blue (0–1) |
| A98 RGB | Red (0–1), Green (0–1), Blue (0–1) |
| ProPhoto RGB | Red (0–1), Green (0–1), Blue (0–1) |
| Rec. 2020 | Red (0–1), Green (0–1), Blue (0–1) |

All spaces include an Alpha channel (0–100%).

## API

### Gradient Functions

- `drawGradient(canvas, topLeft, topRight, bottomLeft, bottomRight, alpha?)` — Render a bilinear gradient via WebGL
- `drawLinearGradient(canvas, colors, vertical?, alpha?)` — Render a linear gradient with 2–16 stops
- `interpolateStops(colors, steps, space)` — Interpolate between colors in a given color space
- `sampleBilinearGrid(tl, tr, bl, br, width, height, space, alpha?)` — Generate RGBA pixel data via bilinear interpolation
- `sampleChannelGrid(baseColor, colorSpace, xChannel, yChannel, xMin, xMax, yMin, yMax, width, height, alpha?)` — Generate RGBA pixel data by varying two channels

### Color Space Functions

- `colorSpaces` — Configuration object for all 12 supported color spaces
- `getChannelConfig(colorSpace, channel)` — Get metadata for a specific channel
- `displayToCulori(config, displayValue)` — Convert display value to culori internal value
- `culoriToDisplay(config, culoriValue)` — Convert culori value to display value

## License

MIT

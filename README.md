# urcolor

Universal, headless color picker component library. Unstyled, composable primitives — bring your own styles.

## Packages

| Package | Description |
|---------|-------------|
| [`@urcolor/core`](./packages/core) | Color conversion utilities and WebGL canvas gradient generator |
| [`@urcolor/vue`](./packages/vue) | Headless Vue 3 components and composables |

> React, Svelte, Angular, and other framework adapters are planned.

## Features

- **Headless** — Radix/Reka UI-style unstyled primitives, full styling freedom
- **Any color space** — sRGB, HSL, HSB, LCH, OKLCH, and more via [`internationalized-color`](https://github.com/user/internationalized-color)
- **Flexible color areas** — Any two-channel combination (Hue+Saturation, Hue+Chroma, etc.)
- **WebGL gradients** — GPU-accelerated canvas backgrounds for color area sliders
- **Reactive** — Vue composables for working with color state reactively

## Setup

```bash
bun install
```

## Project Structure

```
packages/
  core/    # @urcolor/core — color utilities & WebGL gradient engine
  vue/     # @urcolor/vue — headless Vue 3 components & composables
docs/      # VitePress documentation site
```

## Development

```bash
# Run docs dev server
bun run --cwd docs dev
```

## License

MIT

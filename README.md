# urcolor

Headless color picker components for Vue, React, Svelte and Angular, on a
zero-dependency CSS Color 4 engine. Unstyled, composable primitives — bring your
own styles.

[Documentation](https://urcolor.vercel.app/) ·
[Components](https://urcolor.vercel.app/components/) ·
[Benchmarks](https://urcolor.vercel.app/guide/benchmarks)

```sh
bun add urcolor              # the color engine on its own
bun add @urcolor/vue         # …or a framework binding, engine included
```

```ts
import { Color } from "urcolor";

Color.parse("#3b82f6")!.to("oklch").toString(); // "oklch(0.62308 0.18801 259.8145)"
```

## Packages

| Package | Description |
|---------|-------------|
| [`urcolor`](./packages/urcolor) | The engine under an unscoped name — re-exports `@urcolor/core` |
| [`@urcolor/core`](./packages/core) | Color parsing, conversion, mixing, gamut mapping, contrast, delta-E |
| [`@urcolor/shared`](./packages/shared) | Framework-agnostic picker behavior, grid samplers, WebGL gradients, geometry, channel configuration |
| [`@urcolor/vue`](./packages/vue) | Vue 3 components and composables |
| [`@urcolor/react`](./packages/react) | React components and hooks |
| [`@urcolor/svelte`](./packages/svelte) | Svelte 5 components and rune hooks |
| [`@urcolor/angular`](./packages/angular) | Angular directives and signal stores |
| [`@urcolor/relative`](./packages/relative) | Opt-in CSS Color 5 relative color syntax (`rgb(from red r g b)`) |
| [`@urcolor/i18n`](./packages/i18n) | Color names in 298 languages, channel labels in 77 |

## Features

- **Headless** — unstyled primitives in the Radix/Reka tradition, full styling freedom
- **15 color spaces** — sRGB, HSL, HSV, HWB, Lab, LCh, Oklab, OKLCH, Display P3, A98, ProPhoto, Rec. 2020 and XYZ, with zero runtime dependencies
- **Flexible color areas** — any two-channel combination (hue + saturation, lightness + chroma, …), plus wheels, triangles and rings
- **WebGL gradients** — surfaces render on the GPU in one draw call; CPU grid samplers return `Uint8ClampedArray` for `putImageData` where WebGL is unavailable
- **Fast** — benchmarked against culori, chroma-js, colorjs.io, colord and tinycolor2 on every operation a picker performs, with [the losses published alongside the wins](https://urcolor.vercel.app/guide/benchmarks)
- **Accessible** — keyboard navigation, ARIA wiring, and WCAG 2.1 / APCA contrast built in

## Development

```sh
bun install          # install the workspace
bun test             # run every package's tests
bun run build        # build all packages
bun run docs:dev     # docs site with hot reload
```

## Project Structure

```
packages/
  core/        # @urcolor/core — the color engine
  urcolor/     # urcolor — unscoped re-export of the core
  shared/      # @urcolor/shared — picker behavior, grid samplers, WebGL gradients
  vue/         # @urcolor/vue
  react/       # @urcolor/react
  svelte/      # @urcolor/svelte
  angular/     # @urcolor/angular
  relative/    # @urcolor/relative — CSS Color 5 relative syntax
  i18n/        # @urcolor/i18n — multilingual color names
scripts/       # release tooling
docs/          # VitePress documentation site, in seven languages
```

## Releasing

CI runs `bun test` and `bun run build` on every pull request and push to main.

Publishing is version-driven: bump `"version"` in a package's `package.json` and
merge to main. The matching `publish-<package>.yml` calls the shared
[`publish.yml`](.github/workflows/publish.yml), which tests, builds, resolves
`workspace:*` ranges, publishes to npm with provenance, opens a GitHub release
from the package's `## Unreleased` changelog section, and rolls that section
over to the new version. Editing any other field in the manifest publishes
nothing.

## License

MIT

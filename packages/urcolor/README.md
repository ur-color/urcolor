# urcolor

The unscoped name for [`@urcolor/core`](https://www.npmjs.com/package/@urcolor/core) — a
zero-dependency CSS Color 4 engine: parse, convert, mix, compare, gamut-map and
serialize colors across 15 spaces.

Color math only. The grid samplers, WebGL gradient renderer and picker geometry
that the [urcolor](https://urcolor.vercel.app/) components draw with live in
[`@urcolor/shared`](https://www.npmjs.com/package/@urcolor/shared).

```sh
bun add urcolor    # or: npm i urcolor
```

```ts
import { Color } from "urcolor";

const brand = Color.parse("#3b82f6")!;
const white = Color.parse("white")!;

brand.to("oklch").toString();                        // "oklch(0.62308 0.18801 259.8145)"
brand.mix(white, 0.25, { space: "oklab" }).toString(); // "oklab(0.71731 -0.02494 -0.13879)"
brand.contrast(white);                               // 3.6779011537825332
```

## Which name should I install?

Either. This package contains no implementation — it re-exports `@urcolor/core`,
and depends on it by the same caret range the framework adapters use, so a
package manager installs one copy for all of them. Both specifiers then resolve
to the same module instance and the same `Color` class.

| You are | Install |
| --- | --- |
| Using the color engine on its own | `urcolor` |
| Already installing `@urcolor/vue` / `/react` / `/svelte` / `/angular` | `@urcolor/core` — the adapters depend on it, so it is already there |

## Documentation

- [Guide](https://urcolor.vercel.app/guide/) — installation, the `Color` class, color naming
- [Benchmarks](https://urcolor.vercel.app/guide/benchmarks) — measured against culori, chroma-js, colorjs.io, colord and tinycolor2
- [Components](https://urcolor.vercel.app/components/) — the headless picker primitives

## License

MIT

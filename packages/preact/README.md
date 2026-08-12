# @urcolor/preact

Headless, accessible color picker primitives for Preact: color slider, area,
wheel, ring, triangle, field, swatch and swatch group, over the `@urcolor/core`
color engine.

## Install

```sh
bun add @urcolor/preact preact
```

## Usage

```tsx
import { useState } from "preact/hooks";
import { Color } from "@urcolor/core";
import { ColorSlider } from "@urcolor/preact";

export function HueSlider() {
  const [color, setColor] = useState(Color.parse("hsl(210, 80%, 50%)")!);

  return (
    <ColorSlider.Root value={color} channel="h" onValueChange={setColor}>
      <ColorSlider.Control>
        <ColorSlider.Track>
          <ColorSlider.Gradient />
          <ColorSlider.Thumb />
        </ColorSlider.Track>
      </ColorSlider.Control>
    </ColorSlider.Root>
  );
}
```

The API is identical to `@urcolor/react`: this package is that source compiled
against `preact/compat`, so a fix lands in one place and both packages get it.

## TypeScript

The published types are React's. Alias `react` to `preact/compat` in your
`tsconfig.json`, which is what Preact's own compat setup requires anyway:

```json
{
  "compilerOptions": {
    "paths": {
      "react": ["./node_modules/preact/compat/"],
      "react-dom": ["./node_modules/preact/compat/"]
    }
  }
}
```

React and Preact type JSX attributes differently by design: `preact/compat`
widens `style` so it cannot be spread, drops the default type argument on its
event types, and spells `spellcheck` lowercase. Shipping React's types and
letting the alias resolve them is the arrangement that works for both.

The shipped bundle imports only `preact`, `preact/hooks` and
`preact/jsx-runtime`. No React reaches your application.

Documentation: https://urcolor.vercel.app/components/preact/

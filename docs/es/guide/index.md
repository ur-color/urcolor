# Introducción

UrColor es una biblioteca universal y headless de componentes selectores de color. Ofrece primitivas sin estilos y componibles que te dan control total sobre el diseño y el comportamiento.

## Paquetes

- `@urcolor/core` — Una biblioteca CSS Color 4 sin dependencias (analizar, convertir, serializar, mapear a gamut, interpolar) más generadores de degradados WebGL en canvas para áreas y deslizadores de color.
- `@urcolor/primitives` — La capa de comportamiento independiente del framework: arrastre, mapas de teclado, modelos de canal, la fontanería del canvas y los atributos de datos que comparten todos los bindings.
- `@urcolor/relative` — Sintaxis opcional de colores relativos de CSS Color 5 (`rgb(from red r g b)`) para `@urcolor/core`. Consulta [Colores relativos](/guide/relative-colors).
- `@urcolor/i18n` — Nombres de color y etiquetas de canal multilingües. Consulta [Nombres de color](/guide/color-naming).
- `@urcolor/vue` — Componentes y composables headless de Vue 3 para construir selectores de color.
- `@urcolor/react` — Las mismas primitivas para React.
- `@urcolor/svelte` — Las mismas primitivas para Svelte 5, como componentes más hooks basados en runes.
- `@urcolor/angular` — Las mismas primitivas para Angular, como directivas más stores de signals.

Los cuatro bindings ofrecen las mismas ocho familias de componentes. Cada receta de [Cómo hacerlo](/how-to/build-color-area-picker) muestra Vue, React, Svelte y Angular en paralelo: elige la pestaña que corresponda a tu stack.

## Filosofía

Inspirada en Radix UI, Reka UI y React Spectrum, UrColor aporta la lógica y la accesibilidad mientras tú aportas los estilos. El componente de área de color admite combinaciones arbitrarias de dos canales (por ejemplo, Hue+Saturation, o Hue+Chroma en LCH) renderizadas mediante WebGL para lograr degradados suaves y acelerados por GPU.

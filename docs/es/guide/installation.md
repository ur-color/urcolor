# Instalación

## Requisitos previos

- Uno de [Vue 3](https://vuejs.org/) (v3.4+), [React](https://react.dev/) (v18+), [Preact](https://preactjs.com/) (v10.19+), [Svelte](https://svelte.dev/) (v5.29+) o [Angular](https://angular.dev/) (v21.2+)
- [Node.js](https://nodejs.org/) (v18+) o [Bun](https://bun.sh/)

## Paquetes

| Paquete | Descripción |
| --- | --- |
| `urcolor` | El motor de color por separado, con nombre sin ámbito. Reexporta `@urcolor/core` |
| `@urcolor/core` | Lógica de color y utilidades de accesibilidad |
| `@urcolor/shared` | Comportamiento agnóstico del framework, renderizado WebGL y muestreadores de cuadrícula, compartidos por todos los bindings |
| `@urcolor/vue` | Componentes y composables de Vue 3 |
| `@urcolor/react` | Componentes y hooks de React |
| `@urcolor/preact` | Los componentes y hooks de React, compilados contra `preact/compat` |
| `@urcolor/svelte` | Componentes de Svelte 5 y hooks con runes |
| `@urcolor/angular` | Directivas de Angular y stores de signals |
| `@urcolor/relative` | Sintaxis opcional de colores relativos de CSS Color 5 |
| `@urcolor/i18n` | Nombres de color y etiquetas de canal multilingües |

## Instalar

### Vue

::: code-group

```sh [bun]
bun add @urcolor/vue
```

```sh [npm]
npm install @urcolor/vue
```

```sh [pnpm]
pnpm add @urcolor/vue
```

```sh [yarn]
yarn add @urcolor/vue
```

:::

### React

::: code-group

```sh [bun]
bun add @urcolor/react
```

```sh [npm]
npm install @urcolor/react
```

```sh [pnpm]
pnpm add @urcolor/react
```

```sh [yarn]
yarn add @urcolor/react
```

:::

### Preact

::: code-group

```sh [bun]
bun add @urcolor/preact
```

```sh [npm]
npm install @urcolor/preact
```

```sh [pnpm]
pnpm add @urcolor/preact
```

```sh [yarn]
yarn add @urcolor/preact
```

:::

### Svelte

::: code-group

```sh [bun]
bun add @urcolor/svelte
```

```sh [npm]
npm install @urcolor/svelte
```

```sh [pnpm]
pnpm add @urcolor/svelte
```

```sh [yarn]
yarn add @urcolor/svelte
```

:::

### Angular

::: code-group

```sh [bun]
bun add @urcolor/angular
```

```sh [npm]
npm install @urcolor/angular
```

```sh [pnpm]
pnpm add @urcolor/angular
```

```sh [yarn]
yarn add @urcolor/angular
```

:::

Todos los paquetes de framework dependen de `@urcolor/core` y `@urcolor/shared`, así que ambos vienen incluidos. El paquete de Vue arrastra además [Reka UI](https://reka-ui.com/) y el de React [Base UI](https://base-ui.com/); los paquetes de Svelte y Angular no tienen más dependencias en tiempo de ejecución.

### Solo el núcleo

Si solo necesitas las utilidades de color, sin binding de framework, instala `urcolor`, el nombre sin ámbito del mismo motor:

::: code-group

```sh [bun]
bun add urcolor
```

```sh [npm]
npm install urcolor
```

```sh [pnpm]
pnpm add urcolor
```

```sh [yarn]
yarn add urcolor
```

:::

```ts
import { Color } from "urcolor";
```

`urcolor` no tiene código propio: reexporta `@urcolor/core` y depende de él con el mismo rango que los paquetes de framework, así que obtienes una sola copia del motor y una sola clase `Color`. Usa el nombre que prefieras: `@urcolor/core` ya está presente si instalaste un binding, y mezclar ambos nombres en un proyecto es seguro.

### Paquetes opcionales

`@urcolor/relative` añade la sintaxis de colores relativos de CSS Color 5 y `@urcolor/i18n` añade nombres de color multilingües:

::: code-group

```sh [bun]
bun add @urcolor/relative @urcolor/i18n
```

```sh [npm]
npm install @urcolor/relative @urcolor/i18n
```

```sh [pnpm]
pnpm add @urcolor/relative @urcolor/i18n
```

```sh [yarn]
yarn add @urcolor/relative @urcolor/i18n
```

:::

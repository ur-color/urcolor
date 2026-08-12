# Installation

## Voraussetzungen

- Eines von [Vue 3](https://vuejs.org/) (v3.4+), [React](https://react.dev/) (v18+), [Preact](https://preactjs.com/) (v10.19+), [Svelte](https://svelte.dev/) (v5.29+) oder [Angular](https://angular.dev/) (v21.2+)
- [Node.js](https://nodejs.org/) (v18+) oder [Bun](https://bun.sh/)

## Pakete

| Paket | Beschreibung |
| --- | --- |
| `urcolor` | Die Farb-Engine allein, unter unskopiertem Namen. Re-exportiert `@urcolor/core` |
| `@urcolor/core` | Farblogik und Barrierefreiheits-Utilities |
| `@urcolor/shared` | Frameworkunabhängiges Verhalten, WebGL-Rendering und Grid-Sampler, die alle Bindings teilen |
| `@urcolor/vue` | Vue-3-Komponenten und Composables |
| `@urcolor/react` | React-Komponenten und Hooks |
| `@urcolor/preact` | Die React-Komponenten und -Hooks, gegen `preact/compat` kompiliert |
| `@urcolor/svelte` | Svelte-5-Komponenten und Rune-Hooks |
| `@urcolor/angular` | Angular-Direktiven und Signal-Stores |
| `@urcolor/relative` | Optionale relative Farbsyntax aus CSS Color 5 |
| `@urcolor/i18n` | Mehrsprachige Farbnamen und Kanalbezeichnungen |

## Installieren

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

Jedes Framework-Paket hängt von `@urcolor/core` und `@urcolor/shared` ab – beide werden also mitinstalliert. Das Vue-Paket zieht zusätzlich [Reka UI](https://reka-ui.com/) mit, das React-Paket [Base UI](https://base-ui.com/); die Svelte- und Angular-Pakete haben keine weiteren Laufzeitabhängigkeiten.

### Nur der Kern

Wenn du nur die Farb-Utilities ohne Framework-Binding brauchst, installiere `urcolor`, den unskopierten Namen derselben Engine:

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

`urcolor` enthält keinen eigenen Code. Es re-exportiert `@urcolor/core` und hängt in derselben Version davon ab wie die Framework-Pakete, du bekommst also so oder so eine Kopie der Engine und eine `Color`-Klasse. Nimm den Namen, der dir lieber ist: `@urcolor/core` ist ohnehin da, wenn du ein Framework-Binding installiert hast, und beide Namen in einem Projekt zu mischen ist unbedenklich.

### Optionale Pakete

`@urcolor/relative` ergänzt die relative Farbsyntax aus CSS Color 5, `@urcolor/i18n` die mehrsprachige Farbbenennung:

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

# Installation

## Prerequisites

- One of [Vue 3](https://vuejs.org/) (v3.4+), [React](https://react.dev/) (v18+), [Svelte](https://svelte.dev/) (v5.29+), or [Angular](https://angular.dev/) (v21.2+)
- [Node.js](https://nodejs.org/) (v18+) or [Bun](https://bun.sh/)

## Packages

| Package | Description |
| --- | --- |
| `@urcolor/core` | Core color logic, WebGL rendering, and accessibility utilities |
| `@urcolor/primitives` | Framework-agnostic behavior shared by every binding |
| `@urcolor/vue` | Vue 3 components and composables |
| `@urcolor/react` | React components and hooks |
| `@urcolor/svelte` | Svelte 5 components and rune hooks |
| `@urcolor/angular` | Angular directives and signal stores |
| `@urcolor/relative` | Opt-in CSS Color 5 relative color syntax |
| `@urcolor/i18n` | Multilingual color names and channel labels |

## Install

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

Every framework package depends on `@urcolor/core` and `@urcolor/primitives`, so both come along
with whichever binding you install. The Vue package also pulls in
[Reka UI](https://reka-ui.com/) and the React package
[Base UI](https://base-ui.com/); the Svelte and Angular packages have no other
runtime dependencies.

### Core Only

If you only need the color utilities without a framework binding:

::: code-group

```sh [bun]
bun add @urcolor/core
```

```sh [npm]
npm install @urcolor/core
```

```sh [pnpm]
pnpm add @urcolor/core
```

```sh [yarn]
yarn add @urcolor/core
```

:::

### Optional packages

`@urcolor/relative` adds CSS Color 5 relative color syntax, and `@urcolor/i18n`
adds multilingual color naming:

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

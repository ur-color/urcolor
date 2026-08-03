# Установка

## Требования

- Один из [Vue 3](https://vuejs.org/) (v3.4+), [React](https://react.dev/) (v18+), [Svelte](https://svelte.dev/) (v5.29+) или [Angular](https://angular.dev/) (v21.2+)
- [Node.js](https://nodejs.org/) (v18+) или [Bun](https://bun.sh/)

## Пакеты

| Пакет | Описание |
| --- | --- |
| `@urcolor/core` | Логика цвета, WebGL-рендеринг и утилиты доступности |
| `@urcolor/primitives` | Независимое от фреймворка поведение, общее для всех биндингов |
| `@urcolor/vue` | Компоненты и composables для Vue 3 |
| `@urcolor/react` | Компоненты и хуки для React |
| `@urcolor/svelte` | Компоненты Svelte 5 и хуки на рунах |
| `@urcolor/angular` | Директивы Angular и signal-хранилища |
| `@urcolor/relative` | Подключаемый синтаксис относительных цветов CSS Color 5 |
| `@urcolor/i18n` | Многоязычные названия цветов и подписи каналов |

## Установка

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

Каждый фреймворк-пакет зависит от `@urcolor/core` и `@urcolor/primitives`, поэтому оба ставятся вместе с ним. Пакет для Vue дополнительно тянет [Reka UI](https://reka-ui.com/), пакет для React — [Base UI](https://base-ui.com/); у пакетов для Svelte и Angular других рантайм-зависимостей нет.

### Только ядро

Если нужны только утилиты работы с цветом, без привязки к фреймворку:

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

### Дополнительные пакеты

`@urcolor/relative` добавляет синтаксис относительных цветов CSS Color 5, а `@urcolor/i18n` — многоязычные названия цветов:

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

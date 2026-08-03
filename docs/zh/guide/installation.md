# 安装

## 环境要求

- [Vue 3](https://vuejs.org/) (v3.4+)、[React](https://react.dev/) (v18+)、[Svelte](https://svelte.dev/) (v5.29+) 或 [Angular](https://angular.dev/) (v21.2+) 其中之一
- [Node.js](https://nodejs.org/) (v18+) 或 [Bun](https://bun.sh/)

## 软件包

| 软件包 | 说明 |
| --- | --- |
| `@urcolor/core` | 核心颜色逻辑、WebGL 渲染与无障碍工具 |
| `@urcolor/primitives` | 所有绑定共用的、与框架无关的行为层 |
| `@urcolor/vue` | Vue 3 组件与组合式函数 |
| `@urcolor/react` | React 组件与 Hooks |
| `@urcolor/svelte` | Svelte 5 组件与基于 rune 的 hooks |
| `@urcolor/angular` | Angular 指令与 signal store |
| `@urcolor/relative` | 可选的 CSS Color 5 相对颜色语法 |
| `@urcolor/i18n` | 多语言颜色名称与通道标签 |

## 安装

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

每个框架包都依赖 `@urcolor/core` 与 `@urcolor/primitives`，安装时会一并带上。此外，Vue 包会引入 [Reka UI](https://reka-ui.com/)，React 包会引入 [Base UI](https://base-ui.com/)；Svelte 与 Angular 包没有其他运行时依赖。

### 仅核心库

如果你只需要颜色工具，不需要框架绑定：

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

### 可选包

`@urcolor/relative` 提供 CSS Color 5 相对颜色语法，`@urcolor/i18n` 提供多语言颜色命名：

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

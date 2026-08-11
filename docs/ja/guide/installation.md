# インストール

## 前提条件

- [Vue 3](https://vuejs.org/) (v3.4+)、[React](https://react.dev/) (v18+)、[Svelte](https://svelte.dev/) (v5.29+)、[Angular](https://angular.dev/) (v21.2+) のいずれか
- [Node.js](https://nodejs.org/) (v18+) または [Bun](https://bun.sh/)

## パッケージ

| パッケージ | 説明 |
| --- | --- |
| `urcolor` | カラーエンジン単体。スコープなしの名前で `@urcolor/core` を再エクスポートします |
| `@urcolor/core` | コアのカラーロジックとアクセシビリティユーティリティ |
| `@urcolor/shared` | すべてのバインディングが共有するフレームワーク非依存の振る舞い、WebGL 描画、グリッドサンプラー |
| `@urcolor/vue` | Vue 3 のコンポーネントとコンポーザブル |
| `@urcolor/react` | React のコンポーネントとフック |
| `@urcolor/svelte` | Svelte 5 のコンポーネントと rune ベースのフック |
| `@urcolor/angular` | Angular のディレクティブと signal ストア |
| `@urcolor/relative` | オプトイン型の CSS Color 5 相対カラー構文 |
| `@urcolor/i18n` | 多言語のカラー名とチャンネルラベル |

## インストール

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

どのフレームワーク用パッケージも `@urcolor/core` と `@urcolor/shared` に依存しているため、両方が一緒にインストールされます。さらに Vue パッケージは [Reka UI](https://reka-ui.com/)、React パッケージは [Base UI](https://base-ui.com/) を取り込みます。Svelte と Angular のパッケージにはそれ以外のランタイム依存はありません。

### コアのみ

フレームワークバインディングなしでカラーユーティリティだけが必要なら、同じエンジンのスコープなし名 `urcolor` をインストールします。

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

`urcolor` 自体にコードはありません。`@urcolor/core` を再エクスポートし、フレームワークパッケージと同じバージョン範囲で依存しているため、どちらを選んでもエンジンと `Color` クラスは 1 つだけです。好きな名前を使ってください。フレームワークバインディングを入れていれば `@urcolor/core` はすでに存在し、1 つのプロジェクトで両方の名前を混ぜても問題ありません。

### オプションのパッケージ

`@urcolor/relative` は CSS Color 5 の相対カラー構文を、`@urcolor/i18n` は多言語のカラーネーミングを追加します:

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

# Installation

## Prérequis

- L'un de [Vue 3](https://vuejs.org/) (v3.4+), [React](https://react.dev/) (v18+), [Svelte](https://svelte.dev/) (v5.29+) ou [Angular](https://angular.dev/) (v21.2+)
- [Node.js](https://nodejs.org/) (v18+) ou [Bun](https://bun.sh/)

## Paquets

| Paquet | Description |
| --- | --- |
| `urcolor` | Le moteur de couleur seul, sous un nom non scopé. Réexporte `@urcolor/core` |
| `@urcolor/core` | Logique de couleur et utilitaires d'accessibilité |
| `@urcolor/shared` | Comportement indépendant du framework, rendu WebGL et échantillonneurs de grille, partagés par toutes les liaisons |
| `@urcolor/vue` | Composants et composables Vue 3 |
| `@urcolor/react` | Composants et hooks React |
| `@urcolor/svelte` | Composants Svelte 5 et hooks à base de runes |
| `@urcolor/angular` | Directives Angular et stores à signaux |
| `@urcolor/relative` | Syntaxe optionnelle des couleurs relatives CSS Color 5 |
| `@urcolor/i18n` | Noms de couleurs et libellés de canaux multilingues |

## Installer

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

Chaque paquet de framework dépend de `@urcolor/core` et de `@urcolor/shared`, tous deux installés avec lui. Le paquet Vue embarque en plus [Reka UI](https://reka-ui.com/) et le paquet React [Base UI](https://base-ui.com/) ; les paquets Svelte et Angular n'ont aucune autre dépendance d'exécution.

### Le cœur uniquement

Pour les utilitaires de couleur seuls, sans binding de framework, installez `urcolor`, le nom non scopé du même moteur :

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

`urcolor` ne contient aucun code propre : il réexporte `@urcolor/core` et en dépend avec la même plage de versions que les paquets de framework, vous obtenez donc une seule copie du moteur et une seule classe `Color`. Choisissez le nom que vous préférez : `@urcolor/core` est déjà là si vous avez installé un binding, et mélanger les deux noms dans un projet ne pose aucun problème.

### Paquets optionnels

`@urcolor/relative` ajoute la syntaxe des couleurs relatives CSS Color 5 et `@urcolor/i18n` ajoute les noms de couleurs multilingues :

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

# Introduction

UrColor est une bibliothèque universelle et headless de composants de sélection de couleur. Elle fournit des primitives sans styles et composables qui vous laissent la maîtrise totale du rendu et du comportement.

## Paquets

- `@urcolor/core` — Une bibliothèque CSS Color 4 sans dépendances (analyse, conversion, sérialisation, mappage de gamut, interpolation) et des générateurs de dégradés WebGL sur canvas pour les zones et curseurs de couleur.
- `@urcolor/primitives` — La couche de comportement indépendante du framework : glisser-déposer, raccourcis clavier, modèles de canaux, plomberie du canvas et attributs de données partagés par toutes les liaisons.
- `@urcolor/relative` — Syntaxe optionnelle des couleurs relatives CSS Color 5 (`rgb(from red r g b)`) pour `@urcolor/core`. Voir [Couleurs relatives](/guide/relative-colors).
- `@urcolor/i18n` — Noms de couleurs et libellés de canaux multilingues. Voir [Noms de couleurs](/guide/color-naming).
- `@urcolor/vue` — Composants et composables Vue 3 headless pour construire des sélecteurs de couleur.
- `@urcolor/react` — Les mêmes primitives pour React.
- `@urcolor/svelte` — Les mêmes primitives pour Svelte 5, sous forme de composants et de hooks à base de runes.
- `@urcolor/angular` — Les mêmes primitives pour Angular, sous forme de directives et de stores à signaux.

Les quatre liaisons proposent les mêmes huit familles de composants. Chaque recette de la section [Comment faire](/how-to/build-color-area-picker) présente Vue, React, Svelte et Angular côte à côte : choisissez l'onglet correspondant à votre stack.

## Philosophie

Inspirée de Radix UI, Reka UI et React Spectrum, UrColor fournit la logique et l'accessibilité, vous apportez les styles. Le composant de zone de couleur accepte n'importe quelle combinaison de deux canaux (par exemple Hue+Saturation, ou Hue+Chroma en LCH), rendue en WebGL pour des dégradés fluides et accélérés par le GPU.

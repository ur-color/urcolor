# 概要

UrColor は、あらゆる環境で使えるヘッドレスなカラーピッカーコンポーネントライブラリです。スタイルを持たない合成可能なプリミティブを提供し、見た目と挙動は完全にあなたの手に委ねられます。

## パッケージ

- `@urcolor/core` — 依存ゼロの CSS Color 4 ライブラリ（パース、変換、シリアライズ、ガマットマッピング、補間）と、カラーエリアやスライダー向けの WebGL キャンバスグラデーション生成器。
- `@urcolor/primitives` — フレームワークに依存しない振る舞いの層。ドラッグ処理、キーボードマップ、チャンネルモデル、キャンバス配線、データ属性をすべてのバインディングで共有します。
- `@urcolor/relative` — `@urcolor/core` 向けのオプトイン型 CSS Color 5 相対カラー構文（`rgb(from red r g b)`）。[相対カラー](/guide/relative-colors)を参照。
- `@urcolor/i18n` — 多言語のカラー名とチャンネルラベル。[カラーネーミング](/guide/color-naming)を参照。
- `@urcolor/vue` — カラーピッカーを組み立てるためのヘッドレスな Vue 3 コンポーネントとコンポーザブル。
- `@urcolor/react` — 同じプリミティブの React 版。
- `@urcolor/svelte` — 同じプリミティブの Svelte 5 版。コンポーネントと rune ベースのフックを提供します。
- `@urcolor/angular` — 同じプリミティブの Angular 版。ディレクティブと signal ストアを提供します。

4 つのバインディングはいずれも同じ 8 つのコンポーネントファミリーを備えています。[作り方](/how-to/build-color-area-picker)の各レシピは Vue、React、Svelte、Angular のコードを並べて掲載しています。お使いのスタックに合うタブを選んでください。

## 設計思想

UrColor は Radix UI、Reka UI、React Spectrum に着想を得ています。ロジックとアクセシビリティはライブラリが担い、スタイルはあなたが決めます。カラーエリアコンポーネントは任意の 2 チャンネルの組み合わせ（例: Hue+Saturation、LCH の Hue+Chroma）に対応し、WebGL で描画することで滑らかな GPU アクセラレーショングラデーションを実現します。

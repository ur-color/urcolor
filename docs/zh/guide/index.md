# 介绍

UrColor 是一个通用的 headless 颜色选择器组件库。它提供无样式、可组合的基础组件，样式与行为完全由你掌控。

## 软件包

- `@urcolor/core` — 零依赖的 CSS Color 4 库（解析、转换、序列化、色域映射、插值），并包含用于颜色区域和滑块的 WebGL 画布渐变生成器。
- `@urcolor/primitives` — 与框架无关的行为层：拖拽处理、键盘映射、通道模型、画布接线与 data 属性，所有绑定共用同一套实现。
- `@urcolor/relative` — 为 `@urcolor/core` 提供可选的 CSS Color 5 相对颜色语法（`rgb(from red r g b)`）。参见[相对颜色](/guide/relative-colors)。
- `@urcolor/i18n` — 多语言颜色名称与通道标签。参见[颜色命名](/guide/color-naming)。
- `@urcolor/vue` — 用于构建颜色选择器的 headless Vue 3 组件与组合式函数。
- `@urcolor/react` — 面向 React 的同一套基础组件。
- `@urcolor/svelte` — 面向 Svelte 5 的同一套基础组件，提供组件与基于 rune 的 hooks。
- `@urcolor/angular` — 面向 Angular 的同一套基础组件，提供指令与 signal store。

四套绑定都提供相同的八个组件家族。[如何实现](/how-to/build-color-area-picker)中的每篇教程都会并排展示 Vue、React、Svelte 与 Angular 的代码，切换到与你技术栈匹配的标签页即可。

## 设计理念

UrColor 的灵感来自 Radix UI、Reka UI 和 React Spectrum：库负责逻辑与无障碍，样式交给你。颜色区域组件支持任意两个通道的组合（例如 Hue+Saturation，或 LCH 中的 Hue+Chroma），并通过 WebGL 渲染，获得平滑的 GPU 加速渐变。

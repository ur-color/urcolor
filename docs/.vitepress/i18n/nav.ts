/**
 * Navigation labels per locale, and the generators that turn them into a
 * VitePress `themeConfig`. Page *paths* are identical across locales — only the
 * `/<lang>` prefix differs — so one generator covers every language and a new
 * page is added in exactly one place.
 *
 * Component reference entries keep their English names on purpose: those are API
 * identifiers (`ColorSwatchPicker`), not prose.
 */

export interface NavLabels {
  guide: string;
  howTo: string;
  components: string;

  gettingStarted: string;
  introduction: string;
  features: string;
  installation: string;
  colorClass: string;
  relativeColors: string;
  colorNaming: string;
  benchmarks: string;

  areaPicker: string;
  channelSlider: string;
  fields: string;
  swatches: string;
  swatchPicker: string;
  ring: string;
  triangle: string;
  wheel: string;
  triangleInRing: string;
  squareInRing: string;
  materialUi: string;

  overview: string;
  preview: string;
  stories: string;

  /* Default-theme chrome. */
  outline: string;
  returnToTop: string;
  darkMode: string;
  lightMode: string;
  prev: string;
  next: string;
  lastUpdated: string;
  langMenu: string;
}

export const NAV_LABELS: Record<string, NavLabels> = {
  en: {
    guide: "Guide",
    howTo: "How to",
    components: "Components",
    gettingStarted: "Getting Started",
    introduction: "Introduction",
    features: "Features",
    installation: "Installation",
    colorClass: "The Color Class",
    relativeColors: "Relative Colors",
    colorNaming: "Color Naming",
    benchmarks: "Benchmarks",
    areaPicker: "Color Area Picker",
    channelSlider: "Color Channel Slider",
    fields: "Color Fields",
    swatches: "Color Swatches",
    swatchPicker: "Color Swatch Picker",
    ring: "Color Ring",
    triangle: "Color Triangle",
    wheel: "Color Wheel",
    triangleInRing: "Color Picker (Triangle in Ring)",
    squareInRing: "Color Picker (Square in Ring)",
    materialUi: "Material UI Color Picker",
    overview: "Overview",
    preview: "Preview",
    stories: "Stories",
    outline: "On this page",
    returnToTop: "Return to top",
    darkMode: "Switch to dark theme",
    lightMode: "Switch to light theme",
    prev: "Previous page",
    next: "Next page",
    lastUpdated: "Last updated",
    langMenu: "Change language",
  },
  zh: {
    guide: "指南",
    howTo: "如何实现",
    components: "组件",
    gettingStarted: "快速开始",
    introduction: "介绍",
    features: "特性",
    installation: "安装",
    colorClass: "Color 类",
    relativeColors: "相对颜色",
    colorNaming: "颜色命名",
    benchmarks: "性能基准",
    areaPicker: "颜色区域选择器",
    channelSlider: "颜色通道滑块",
    fields: "颜色输入框",
    swatches: "色块",
    swatchPicker: "色块选择器",
    ring: "色环",
    triangle: "色三角",
    wheel: "色轮",
    triangleInRing: "颜色选择器（环中三角）",
    squareInRing: "颜色选择器（环中方形）",
    materialUi: "Material UI 颜色选择器",
    overview: "总览",
    preview: "预览",
    stories: "Stories",
    outline: "本页目录",
    returnToTop: "返回顶部",
    darkMode: "切换到深色主题",
    lightMode: "切换到浅色主题",
    prev: "上一页",
    next: "下一页",
    lastUpdated: "最后更新于",
    langMenu: "切换语言",
  },
  ja: {
    guide: "ガイド",
    howTo: "作り方",
    components: "コンポーネント",
    gettingStarted: "はじめに",
    introduction: "概要",
    features: "特徴",
    installation: "インストール",
    colorClass: "Color クラス",
    relativeColors: "相対カラー",
    colorNaming: "カラーネーミング",
    benchmarks: "ベンチマーク",
    areaPicker: "カラーエリアピッカー",
    channelSlider: "カラーチャンネルスライダー",
    fields: "カラーフィールド",
    swatches: "カラースウォッチ",
    swatchPicker: "スウォッチピッカー",
    ring: "カラーリング",
    triangle: "カラートライアングル",
    wheel: "カラーホイール",
    triangleInRing: "カラーピッカー（リング内トライアングル）",
    squareInRing: "カラーピッカー（リング内スクエア）",
    materialUi: "Material UI カラーピッカー",
    overview: "概要",
    preview: "プレビュー",
    stories: "Stories",
    outline: "このページの内容",
    returnToTop: "トップへ戻る",
    darkMode: "ダークテーマに切り替え",
    lightMode: "ライトテーマに切り替え",
    prev: "前のページ",
    next: "次のページ",
    lastUpdated: "最終更新",
    langMenu: "言語を変更",
  },
  es: {
    guide: "Guía",
    howTo: "Cómo hacerlo",
    components: "Componentes",
    gettingStarted: "Primeros pasos",
    introduction: "Introducción",
    features: "Características",
    installation: "Instalación",
    colorClass: "La clase Color",
    relativeColors: "Colores relativos",
    colorNaming: "Nombres de color",
    benchmarks: "Benchmarks",
    areaPicker: "Selector de área de color",
    channelSlider: "Deslizador de canal",
    fields: "Campos de color",
    swatches: "Muestras de color",
    swatchPicker: "Selector de muestras",
    ring: "Anillo de color",
    triangle: "Triángulo de color",
    wheel: "Rueda de color",
    triangleInRing: "Selector de color (triángulo en anillo)",
    squareInRing: "Selector de color (cuadrado en anillo)",
    materialUi: "Selector de color Material UI",
    overview: "Visión general",
    preview: "Vista previa",
    stories: "Stories",
    outline: "En esta página",
    returnToTop: "Volver arriba",
    darkMode: "Cambiar al tema oscuro",
    lightMode: "Cambiar al tema claro",
    prev: "Página anterior",
    next: "Página siguiente",
    lastUpdated: "Última actualización",
    langMenu: "Cambiar idioma",
  },
  fr: {
    guide: "Guide",
    howTo: "Comment faire",
    components: "Composants",
    gettingStarted: "Démarrage",
    introduction: "Introduction",
    features: "Fonctionnalités",
    installation: "Installation",
    colorClass: "La classe Color",
    relativeColors: "Couleurs relatives",
    colorNaming: "Noms de couleurs",
    benchmarks: "Benchmarks",
    areaPicker: "Sélecteur de zone de couleur",
    channelSlider: "Curseur de canal",
    fields: "Champs de couleur",
    swatches: "Échantillons de couleur",
    swatchPicker: "Sélecteur d'échantillons",
    ring: "Anneau de couleur",
    triangle: "Triangle de couleur",
    wheel: "Roue chromatique",
    triangleInRing: "Sélecteur de couleur (triangle dans l'anneau)",
    squareInRing: "Sélecteur de couleur (carré dans l'anneau)",
    materialUi: "Sélecteur de couleur Material UI",
    overview: "Vue d'ensemble",
    preview: "Aperçu",
    stories: "Stories",
    outline: "Sur cette page",
    returnToTop: "Retour en haut",
    darkMode: "Passer au thème sombre",
    lightMode: "Passer au thème clair",
    prev: "Page précédente",
    next: "Page suivante",
    lastUpdated: "Dernière mise à jour",
    langMenu: "Changer de langue",
  },
  de: {
    guide: "Leitfaden",
    howTo: "Anleitungen",
    components: "Komponenten",
    gettingStarted: "Erste Schritte",
    introduction: "Einführung",
    features: "Funktionen",
    installation: "Installation",
    colorClass: "Die Color-Klasse",
    relativeColors: "Relative Farben",
    colorNaming: "Farbbenennung",
    benchmarks: "Benchmarks",
    areaPicker: "Farbflächen-Picker",
    channelSlider: "Kanal-Slider",
    fields: "Farbfelder",
    swatches: "Farbmuster",
    swatchPicker: "Farbmuster-Picker",
    ring: "Farbring",
    triangle: "Farbdreieck",
    wheel: "Farbrad",
    triangleInRing: "Farbwähler (Dreieck im Ring)",
    squareInRing: "Farbwähler (Quadrat im Ring)",
    materialUi: "Material-UI-Farbwähler",
    overview: "Überblick",
    preview: "Vorschau",
    stories: "Stories",
    outline: "Auf dieser Seite",
    returnToTop: "Nach oben",
    darkMode: "Zum dunklen Theme wechseln",
    lightMode: "Zum hellen Theme wechseln",
    prev: "Vorherige Seite",
    next: "Nächste Seite",
    lastUpdated: "Zuletzt aktualisiert",
    langMenu: "Sprache wechseln",
  },
  ru: {
    guide: "Руководство",
    howTo: "Рецепты",
    components: "Компоненты",
    gettingStarted: "Начало работы",
    introduction: "Введение",
    features: "Возможности",
    installation: "Установка",
    colorClass: "Класс Color",
    relativeColors: "Относительные цвета",
    colorNaming: "Названия цветов",
    benchmarks: "Бенчмарки",
    areaPicker: "Пикер цветовой области",
    channelSlider: "Слайдер канала",
    fields: "Поля ввода цвета",
    swatches: "Образцы цвета",
    swatchPicker: "Выбор образцов",
    ring: "Цветовое кольцо",
    triangle: "Цветовой треугольник",
    wheel: "Цветовой круг",
    triangleInRing: "Пикер цвета (треугольник в кольце)",
    squareInRing: "Пикер цвета (квадрат в кольце)",
    materialUi: "Пикер цвета в стиле Material UI",
    overview: "Обзор",
    preview: "Превью",
    stories: "Stories",
    outline: "Содержание",
    returnToTop: "Наверх",
    darkMode: "Переключить на тёмную тему",
    lightMode: "Переключить на светлую тему",
    prev: "Предыдущая страница",
    next: "Следующая страница",
    lastUpdated: "Последнее обновление",
    langMenu: "Сменить язык",
  },
};

const HOW_TO_PAGES = [
  ["areaPicker", "build-color-area-picker"],
  ["channelSlider", "build-color-channel-slider"],
  ["fields", "build-color-fields"],
  ["swatches", "build-color-swatches"],
  ["swatchPicker", "build-color-swatch-picker"],
  ["ring", "build-color-ring"],
  ["triangle", "build-color-triangle"],
  ["wheel", "build-color-wheel"],
  ["triangleInRing", "build-color-picker-triangle-in-ring"],
  ["squareInRing", "build-color-picker-square-in-ring"],
  ["materialUi", "build-material-ui-color-picker"],
] as const satisfies readonly (readonly [keyof NavLabels, string])[];

const VUE_COMPONENTS = [
  ["Color Area", "color-area"],
  ["Color Slider", "color-slider"],
  ["Color Field", "color-field"],
  ["Color Swatch", "color-swatch"],
  ["Color Swatch Picker", "color-swatch-picker"],
  ["Color Wheel", "color-wheel"],
  ["Color Triangle", "color-triangle"],
  ["Color Ring", "color-ring"],
] as const;

const REACT_COMPONENTS = [
  ["Color Area", "color-area"],
  ["Color Slider", "color-slider"],
  ["Color Field", "color-field"],
  ["Color Swatch", "color-swatch"],
  ["Color Swatch Group", "color-swatch-group"],
  ["Color Wheel", "color-wheel"],
  ["Color Triangle", "color-triangle"],
  ["Color Ring", "color-ring"],
] as const;

/** Svelte and Angular follow React's naming, so both use `color-swatch-group`. */
const SVELTE_COMPONENTS = [
  ["Color Area", "color-area"],
  ["Color Slider", "color-slider"],
  ["Color Field", "color-field"],
  ["Color Swatch", "color-swatch"],
  ["Color Swatch Group", "color-swatch-group"],
  ["Color Wheel", "color-wheel"],
  ["Color Triangle", "color-triangle"],
  ["Color Ring", "color-ring"],
] as const;

const ANGULAR_COMPONENTS = SVELTE_COMPONENTS;

export function labelsFor(lang: string): NavLabels {
  return NAV_LABELS[lang] ?? NAV_LABELS.en!;
}

/** `""` for the root locale, `"/zh"` and friends for the rest. */
export function prefixFor(lang: string): string {
  return lang === "en" ? "" : `/${lang}`;
}

export function navFor(lang: string, exists: PageExists = () => true) {
  const t = labelsFor(lang);
  const p = prefixFor(lang);
  const dir = lang === "en" ? "" : `${lang}/`;
  const nav = [{ text: t.guide, link: `${p}/guide/` }];
  const firstHowTo = HOW_TO_PAGES.find(([, slug]) => exists(`${dir}how-to/${slug}.md`));
  if (firstHowTo) nav.push({ text: t.howTo, link: `${p}/how-to/${firstHowTo[1]}` });
  if (exists(`${dir}components/index.md`)) {
    nav.push({ text: t.components, link: `${p}/components/` });
  }
  return nav;
}

/**
 * Whether a page exists for this locale, given as a docs-root-relative markdown
 * path such as `"zh/guide/features.md"`. Translation lands page by page, so the
 * sidebar is filtered against the filesystem rather than assuming a locale is
 * complete — a link to a page nobody has translated yet is a 404, not a
 * placeholder.
 */
export type PageExists = (relativePath: string) => boolean;

interface Entry { text: string; link: string }

function keep(exists: PageExists, lang: string, entries: (Entry & { file: string })[]): Entry[] {
  const dir = lang === "en" ? "" : `${lang}/`;
  return entries
    .filter(e => exists(`${dir}${e.file}`))
    .map(({ text, link }) => ({ text, link }));
}

export function sidebarFor(lang: string, exists: PageExists = () => true) {
  const t = labelsFor(lang);
  const p = prefixFor(lang);

  const gettingStarted = keep(exists, lang, [
    { text: t.introduction, link: `${p}/guide/`, file: "guide/index.md" },
    { text: t.features, link: `${p}/guide/features`, file: "guide/features.md" },
    { text: t.installation, link: `${p}/guide/installation`, file: "guide/installation.md" },
    { text: t.colorClass, link: `${p}/guide/color-class`, file: "guide/color-class.md" },
    { text: t.relativeColors, link: `${p}/guide/relative-colors`, file: "guide/relative-colors.md" },
    { text: t.colorNaming, link: `${p}/guide/color-naming`, file: "guide/color-naming.md" },
    { text: t.benchmarks, link: `${p}/guide/benchmarks`, file: "guide/benchmarks.md" },
  ]);

  const howTo = keep(exists, lang, HOW_TO_PAGES.map(([key, slug]) => ({
    text: t[key],
    link: `${p}/how-to/${slug}`,
    file: `how-to/${slug}.md`,
  })));

  const componentsOverview = keep(exists, lang, [
    { text: t.overview, link: `${p}/components/`, file: "components/index.md" },
    { text: t.preview, link: `${p}/components/vue/preview`, file: "components/vue/preview.md" },
    { text: t.stories, link: `${p}/components/vue/stories`, file: "components/vue/stories.md" },
  ]);

  const vue = keep(exists, lang, VUE_COMPONENTS.map(([text, slug]) => ({
    text,
    link: `${p}/components/vue/${slug}`,
    file: `components/vue/${slug}.md`,
  })));

  const react = keep(exists, lang, REACT_COMPONENTS.map(([text, slug]) => ({
    text,
    link: `${p}/components/react/${slug}`,
    file: `components/react/${slug}.md`,
  })));

  const svelte = keep(exists, lang, SVELTE_COMPONENTS.map(([text, slug]) => ({
    text,
    link: `${p}/components/svelte/${slug}`,
    file: `components/svelte/${slug}.md`,
  })));

  const angular = keep(exists, lang, ANGULAR_COMPONENTS.map(([text, slug]) => ({
    text,
    link: `${p}/components/angular/${slug}`,
    file: `components/angular/${slug}.md`,
  })));

  const guideSidebar = [
    { text: t.gettingStarted, items: gettingStarted },
    { text: t.howTo, items: howTo },
  ].filter(group => group.items.length > 0);

  const componentsSidebar = [
    { text: t.components, items: componentsOverview },
    { text: "Vue", items: vue },
    { text: "React", items: react },
    { text: "Svelte", items: svelte },
    { text: "Angular", items: angular },
  ].filter(group => group.items.length > 0);

  return {
    [`${p}/guide/`]: guideSidebar,
    [`${p}/how-to/`]: guideSidebar,
    [`${p}/components/`]: componentsSidebar,
  };
}

/** The default theme's own chrome, which ships English-only. */
export function themeChromeFor(lang: string) {
  const t = labelsFor(lang);
  return {
    outline: { label: t.outline, level: [2, 3] as [number, number] },
    returnToTopLabel: t.returnToTop,
    darkModeSwitchLabel: t.darkMode,
    lightModeSwitchTitle: t.lightMode,
    darkModeSwitchTitle: t.darkMode,
    langMenuLabel: t.langMenu,
    docFooter: { prev: t.prev, next: t.next },
    lastUpdatedText: t.lastUpdated,
  };
}

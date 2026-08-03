/**
 * UI strings for the parts of the site that are Vue components rather than
 * markdown — the hero and its readouts. Markdown pages are translated as whole
 * files under `docs/<lang>/`; only chrome lives here.
 *
 * Keyed by the base language subtag, which is what `useDocsLang()` returns.
 */

export interface HeroStrings {
  tagline: string;
  lede: string;
  getStarted: string;
  components: string;
  labelName: string;
  labelFormats: string;
  labelPalette: string;
  labelChannels: string;
  noData: string;
  closestMatch: string;
}

export const HERO_STRINGS: Record<string, HeroStrings> = {
  en: {
    tagline: "Universal color picker component library",
    lede: "Headless, accessible primitives for every color space — sRGB, HSL, LCH, OKLCH — in any framework, with no runtime dependencies.",
    getStarted: "Get Started",
    components: "Components",
    labelName: "Name",
    labelFormats: "Formats",
    labelPalette: "Palette",
    labelChannels: "Channels",
    noData: "No data",
    closestMatch: "closest catalogued",
  },
  zh: {
    tagline: "通用颜色选择器组件库",
    lede: "无样式、可访问的基础组件，覆盖 sRGB、HSL、LCH、OKLCH 等各类色彩空间，适用于任意框架，且没有运行时依赖。",
    getStarted: "开始使用",
    components: "组件",
    labelName: "名称",
    labelFormats: "格式",
    labelPalette: "色板",
    labelChannels: "通道",
    noData: "无数据",
    closestMatch: "最接近的编目色",
  },
  ja: {
    tagline: "あらゆる環境で使えるカラーピッカーコンポーネントライブラリ",
    lede: "sRGB、HSL、LCH、OKLCH などすべての色空間に対応する、ヘッドレスでアクセシブルなプリミティブ。フレームワークを問わず、ランタイム依存はありません。",
    getStarted: "はじめる",
    components: "コンポーネント",
    labelName: "名前",
    labelFormats: "フォーマット",
    labelPalette: "パレット",
    labelChannels: "チャンネル",
    noData: "データなし",
    closestMatch: "最も近い登録色",
  },
  es: {
    tagline: "Biblioteca universal de componentes selectores de color",
    lede: "Primitivas headless y accesibles para todos los espacios de color —sRGB, HSL, LCH, OKLCH— en cualquier framework y sin dependencias en tiempo de ejecución.",
    getStarted: "Comenzar",
    components: "Componentes",
    labelName: "Nombre",
    labelFormats: "Formatos",
    labelPalette: "Paleta",
    labelChannels: "Canales",
    noData: "Sin datos",
    closestMatch: "color catalogado más cercano",
  },
  fr: {
    tagline: "Bibliothèque universelle de composants de sélection de couleur",
    lede: "Des primitives headless et accessibles pour tous les espaces colorimétriques — sRGB, HSL, LCH, OKLCH — dans n'importe quel framework, sans dépendance d'exécution.",
    getStarted: "Commencer",
    components: "Composants",
    labelName: "Nom",
    labelFormats: "Formats",
    labelPalette: "Palette",
    labelChannels: "Canaux",
    noData: "Aucune donnée",
    closestMatch: "couleur cataloguée la plus proche",
  },
  de: {
    tagline: "Universelle Komponentenbibliothek für Farbwähler",
    lede: "Headless, barrierefreie Primitive für jeden Farbraum – sRGB, HSL, LCH, OKLCH – in jedem Framework und ohne Laufzeitabhängigkeiten.",
    getStarted: "Loslegen",
    components: "Komponenten",
    labelName: "Name",
    labelFormats: "Formate",
    labelPalette: "Palette",
    labelChannels: "Kanäle",
    noData: "Keine Daten",
    closestMatch: "nächstgelegene Katalogfarbe",
  },
  ru: {
    tagline: "Универсальная библиотека компонентов выбора цвета",
    lede: "Headless-примитивы с поддержкой доступности для любого цветового пространства — sRGB, HSL, LCH, OKLCH — в любом фреймворке и без зависимостей во время выполнения.",
    getStarted: "Начать",
    components: "Компоненты",
    labelName: "Название",
    labelFormats: "Форматы",
    labelPalette: "Палитра",
    labelChannels: "Каналы",
    noData: "Нет данных",
    closestMatch: "ближайший каталожный цвет",
  },
};

/** The locales the site is published in, in nav order. */
export const SITE_LANGS = ["en", "zh", "ja", "es", "fr", "de", "ru"] as const;

export function heroStrings(lang: string): HeroStrings {
  return HERO_STRINGS[lang] ?? HERO_STRINGS.en!;
}

/* ---------- landing-page feature cards ---------- */

export interface FeatureStrings {
  /** Anchor on `/guide/features`, shared by every locale. */
  anchor: string;
  title: string;
  details: string;
}

/**
 * Six cards per locale, in display order — most central to the library first.
 * `@urcolor/i18n` is an optional add-on package, so it comes last.
 */
export const FEATURE_STRINGS: Record<string, FeatureStrings[]> = {
  en: [
    { anchor: "unstyled", title: "Headless primitives", details: "Eight component families — area, slider, field, swatch, swatch picker, wheel, triangle, ring — with no styles of their own." },
    { anchor: "color-spaces", title: "Any color space", details: "sRGB, HSL, HSV, Lab, LCH, OKLab, OKLCH, Display P3 and more, through a zero-dependency CSS Color 4 engine." },
    { anchor: "accessible", title: "Accessible", details: "The WAI-ARIA color picker pattern: keyboard control, screen reader announcements, managed focus." },
    { anchor: "fast", title: "WebGL gradients", details: "Every pixel is computed on the GPU, so Lab and OKLCH ramps stay accurate where CSS gradients cannot." },
    { anchor: "multi-framework", title: "Vue and React", details: "The same primitives in both, over one shared core. Svelte, Angular and more are planned." },
    { anchor: "languages", title: "Multilingual naming", details: "Optional @urcolor/i18n: channel labels in 77 languages and color names in 298." },
  ],
  zh: [
    { anchor: "unstyled", title: "Headless 基础组件", details: "八类组件——颜色区域、滑块、输入框、色块、色块选择器、色轮、色三角、色环——本身不带任何样式。" },
    { anchor: "color-spaces", title: "任意色彩空间", details: "通过零依赖的 CSS Color 4 引擎支持 sRGB、HSL、HSV、Lab、LCH、OKLab、OKLCH、Display P3 等。" },
    { anchor: "accessible", title: "无障碍", details: "遵循 WAI-ARIA 颜色选择器模式：键盘操作、屏幕阅读器播报、焦点管理。" },
    { anchor: "fast", title: "WebGL 渐变", details: "逐像素在 GPU 上计算，因此 Lab 与 OKLCH 渐变在 CSS 无能为力的地方依然准确。" },
    { anchor: "multi-framework", title: "Vue 与 React", details: "两个框架共享同一内核、同一套基础组件。Svelte、Angular 等正在规划中。" },
    { anchor: "languages", title: "多语言命名", details: "可选的 @urcolor/i18n：77 种语言的通道标签，298 种语言的颜色名称。" },
  ],
  ja: [
    { anchor: "unstyled", title: "ヘッドレスなプリミティブ", details: "エリア、スライダー、フィールド、スウォッチ、スウォッチピッカー、ホイール、トライアングル、リングの 8 系統。スタイルは一切持ちません。" },
    { anchor: "color-spaces", title: "あらゆる色空間", details: "依存ゼロの CSS Color 4 エンジンで sRGB、HSL、HSV、Lab、LCH、OKLab、OKLCH、Display P3 などに対応。" },
    { anchor: "accessible", title: "アクセシブル", details: "WAI-ARIA のカラーピッカーパターン: キーボード操作、スクリーンリーダーへの通知、フォーカス管理。" },
    { anchor: "fast", title: "WebGL グラデーション", details: "GPU で 1 ピクセルずつ計算するため、CSS では表現できない Lab や OKLCH のグラデーションも正確です。" },
    { anchor: "multi-framework", title: "Vue と React", details: "共通のコアの上に、同じプリミティブを両方で提供。Svelte や Angular なども予定しています。" },
    { anchor: "languages", title: "多言語のネーミング", details: "オプションの @urcolor/i18n: チャンネルラベルは 77 言語、カラー名は 298 言語。" },
  ],
  es: [
    { anchor: "unstyled", title: "Primitivas headless", details: "Ocho familias de componentes —área, deslizador, campo, muestra, selector de muestras, rueda, triángulo y anillo— sin estilos propios." },
    { anchor: "color-spaces", title: "Cualquier espacio de color", details: "sRGB, HSL, HSV, Lab, LCH, OKLab, OKLCH, Display P3 y más, mediante un motor CSS Color 4 sin dependencias." },
    { anchor: "accessible", title: "Accesible", details: "El patrón WAI-ARIA de selector de color: control por teclado, anuncios para lectores de pantalla y gestión del foco." },
    { anchor: "fast", title: "Degradados WebGL", details: "Cada píxel se calcula en la GPU, así que los degradados Lab y OKLCH son exactos donde CSS no llega." },
    { anchor: "multi-framework", title: "Vue y React", details: "Las mismas primitivas en ambos, sobre un núcleo compartido. Svelte, Angular y más están en camino." },
    { anchor: "languages", title: "Nombres multilingües", details: "@urcolor/i18n opcional: etiquetas de canal en 77 idiomas y nombres de color en 298." },
  ],
  fr: [
    { anchor: "unstyled", title: "Primitives headless", details: "Huit familles de composants — zone, curseur, champ, échantillon, sélecteur d'échantillons, roue, triangle, anneau — sans aucun style imposé." },
    { anchor: "color-spaces", title: "Tous les espaces colorimétriques", details: "sRGB, HSL, HSV, Lab, LCH, OKLab, OKLCH, Display P3 et plus, via un moteur CSS Color 4 sans dépendances." },
    { anchor: "accessible", title: "Accessible", details: "Le modèle WAI-ARIA de sélecteur de couleur : contrôle clavier, annonces pour lecteurs d'écran, gestion du focus." },
    { anchor: "fast", title: "Dégradés WebGL", details: "Chaque pixel est calculé sur le GPU : les dégradés Lab et OKLCH restent exacts là où CSS échoue." },
    { anchor: "multi-framework", title: "Vue et React", details: "Les mêmes primitives des deux côtés, sur un cœur commun. Svelte, Angular et d'autres sont prévus." },
    { anchor: "languages", title: "Nommage multilingue", details: "@urcolor/i18n en option : libellés de canaux en 77 langues et noms de couleurs en 298." },
  ],
  de: [
    { anchor: "unstyled", title: "Headless-Primitive", details: "Acht Komponentenfamilien – Fläche, Slider, Feld, Farbmuster, Muster-Picker, Rad, Dreieck, Ring – ganz ohne eigene Styles." },
    { anchor: "color-spaces", title: "Jeder Farbraum", details: "sRGB, HSL, HSV, Lab, LCH, OKLab, OKLCH, Display P3 und mehr über eine abhängigkeitsfreie CSS-Color-4-Engine." },
    { anchor: "accessible", title: "Barrierefrei", details: "Das WAI-ARIA-Muster für Farbwähler: Tastatursteuerung, Screenreader-Ansagen, Fokusverwaltung." },
    { anchor: "fast", title: "WebGL-Verläufe", details: "Jedes Pixel wird auf der GPU berechnet – Lab- und OKLCH-Verläufe bleiben korrekt, wo CSS scheitert." },
    { anchor: "multi-framework", title: "Vue und React", details: "Dieselben Primitive in beiden, auf einem gemeinsamen Kern. Svelte, Angular und weitere sind geplant." },
    { anchor: "languages", title: "Mehrsprachige Benennung", details: "Optionales @urcolor/i18n: Kanalbezeichnungen in 77 Sprachen, Farbnamen in 298." },
  ],
  ru: [
    { anchor: "unstyled", title: "Headless-примитивы", details: "Восемь семейств компонентов — область, слайдер, поле, образец, выбор образцов, круг, треугольник, кольцо — без собственных стилей." },
    { anchor: "color-spaces", title: "Любое цветовое пространство", details: "sRGB, HSL, HSV, Lab, LCH, OKLab, OKLCH, Display P3 и другие — через движок CSS Color 4 без зависимостей." },
    { anchor: "accessible", title: "Доступность", details: "Паттерн WAI-ARIA для выбора цвета: управление с клавиатуры, объявления для скринридеров, управление фокусом." },
    { anchor: "fast", title: "WebGL-градиенты", details: "Каждый пиксель считается на GPU, поэтому градиенты Lab и OKLCH точны там, где CSS не справляется." },
    { anchor: "multi-framework", title: "Vue и React", details: "Одни и те же примитивы в обоих, поверх общего ядра. Svelte, Angular и другие — в планах." },
    { anchor: "languages", title: "Названия на многих языках", details: "Опциональный @urcolor/i18n: подписи каналов на 77 языках и названия цветов на 298." },
  ],
};

export function featureStrings(lang: string): FeatureStrings[] {
  return FEATURE_STRINGS[lang] ?? FEATURE_STRINGS.en!;
}

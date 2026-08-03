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
 * Lucide glyphs, inlined because VitePress's own feature cards take their icon
 * as a raw markup string in page data — there is no component slot to hand a
 * `lucide-vue-next` import to. Parallel to the six cards below.
 */
export const FEATURE_ICONS = [
  /* paintbrush */ "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m14.622 17.897-10.68-2.913'/><path d='M18.376 2.622a1 1 0 1 1 3.002 3.002L17.36 9.643a.5.5 0 0 0 0 .707l.944.944a2.41 2.41 0 0 1 0 3.408l-.944.944a.5.5 0 0 1-.707 0L8.354 7.348a.5.5 0 0 1 0-.707l.944-.944a2.41 2.41 0 0 1 3.408 0l.944.944a.5.5 0 0 0 .707 0z'/><path d='M9 8c-1.804 2.71-3.97 3.46-6.583 3.948a.507.507 0 0 0-.302.819l7.32 8.883a1 1 0 0 0 1.185.204C12.735 20.405 16 16.792 16 15'/></svg>",
  /* palette */ "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z'/><circle cx='13.5' cy='6.5' r='.5' fill='currentColor'/><circle cx='17.5' cy='10.5' r='.5' fill='currentColor'/><circle cx='6.5' cy='12.5' r='.5' fill='currentColor'/><circle cx='8.5' cy='7.5' r='.5' fill='currentColor'/></svg>",
  /* keyboard */ "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M10 8h.01'/><path d='M12 12h.01'/><path d='M14 8h.01'/><path d='M16 12h.01'/><path d='M18 8h.01'/><path d='M6 8h.01'/><path d='M7 16h10'/><path d='M8 12h.01'/><rect width='20' height='16' x='2' y='4' rx='2'/></svg>",
  /* zap */ "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z'/></svg>",
  /* blocks */ "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M10 22V7a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a1 1 0 0 0-1-1H2'/><rect x='14' y='2' width='8' height='8' rx='1'/></svg>",
  /* globe */ "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'/><path d='M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20'/><path d='M2 12h20'/></svg>",
] as const;

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

/* ---------- home page front matter ---------- */

/**
 * The landing page renders through VitePress's stock `home` layout, which
 * reads its hero and cards out of page data rather than from markup. Building
 * that data here keeps all seven locales in the tables above instead of
 * duplicating the copy — and six inline SVGs — across seven `index.md` files.
 * `docs/.vitepress/config.ts` merges the result in `transformPageData`.
 */
export function homeFrontmatter(lang: string) {
  const s = heroStrings(lang);
  const prefix = lang === "en" ? "" : `/${lang}`;

  return {
    hero: {
      // The theme renders `name` as raw markup; only the "Ur" carries the
      // brand gradient, the rest reads as plain heading text (see custom.css).
      name: "<span class='hero-ur'>Ur</span>Color",
      text: s.tagline,
      tagline: s.lede,
      actions: [
        { theme: "brand", text: s.getStarted, link: `${prefix}/guide/` },
        { theme: "alt", text: s.components, link: `${prefix}/components/` },
      ],
    },
    features: featureStrings(lang).map((f, i) => ({
      icon: FEATURE_ICONS[i],
      title: f.title,
      details: f.details,
      link: `${prefix}/guide/features#${f.anchor}`,
    })),
  };
}

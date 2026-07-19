import { filterSupportedLocales, negotiateLocale } from "./engine/locale";
import { translations, type ChannelTranslations } from "./channels";

/** Lowercase channel identifiers, e.g. `"hue"`, `"saturation"`. */
export type ChannelKey = Lowercase<keyof ChannelTranslations>;

const CHANNEL_LOOKUP: Record<string, keyof ChannelTranslations> = {
  hue: "Hue",
  saturation: "Saturation",
  lightness: "Lightness",
  value: "Value",
  brightness: "Brightness",
  whiteness: "Whiteness",
  blackness: "Blackness",
  chroma: "Chroma",
  red: "Red",
  green: "Green",
  blue: "Blue",
  alpha: "Alpha",
};

const AVAILABLE = Object.keys(translations);

/**
 * Channel-label translations, shaped after `Intl.DisplayNames`.
 *
 * ```ts
 * new ChannelNames("ko").of("hue"); // "색상"
 * ```
 */
export class ChannelNames {
  readonly #locale: string;
  readonly #table: ChannelTranslations;

  constructor(locales: string | readonly string[]) {
    this.#locale = negotiateLocale(locales, AVAILABLE) ?? "en";
    // The negotiated locale always exists in `translations`, and "en" is
    // guaranteed present, so this cannot be undefined.
    this.#table = translations[this.#locale]!;
  }

  /** The translated label, or `undefined` for an unknown channel. */
  of(channel: ChannelKey): string | undefined {
    const key = CHANNEL_LOOKUP[channel];
    return key === undefined ? undefined : this.#table[key];
  }

  resolvedOptions(): { locale: string } {
    return { locale: this.#locale };
  }

  static supportedLocalesOf(locales: string | readonly string[]): string[] {
    return filterSupportedLocales(locales, AVAILABLE);
  }
}

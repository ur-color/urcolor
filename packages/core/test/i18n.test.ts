import { test, expect, describe } from "bun:test";
import { getChannelLabel, translations, type ChannelTranslations } from "../src/i18n";

const channelKeys: (keyof ChannelTranslations)[] = [
  "Hue", "Saturation", "Lightness", "Value", "Brightness",
  "Whiteness", "Blackness", "Chroma", "Red", "Green", "Blue", "Alpha",
];

describe("getChannelLabel", () => {
  test("returns English labels", () => {
    expect(getChannelLabel("en", "Hue")).toBe("Hue");
    expect(getChannelLabel("en", "Red")).toBe("Red");
    expect(getChannelLabel("en", "Alpha")).toBe("Alpha");
  });

  test("returns translated labels", () => {
    expect(getChannelLabel("uk", "Saturation")).toBe("Насиченість");
    expect(getChannelLabel("fr", "Red")).toBe("Rouge");
    expect(getChannelLabel("zh", "Blue")).toBe("蓝");
    expect(getChannelLabel("ja", "Hue")).toBe("色相");
    expect(getChannelLabel("de", "Lightness")).toBe("Helligkeit");
    expect(getChannelLabel("ar", "Green")).toBe("أخضر");
    expect(getChannelLabel("ko", "Alpha")).toBe("알파");
  });

  test("falls back to English for unknown locale", () => {
    expect(getChannelLabel("xx", "Hue")).toBe("Hue");
    expect(getChannelLabel("zz-ZZ", "Red")).toBe("Red");
  });
});

describe("translations", () => {
  test("every locale has all 12 channel keys", () => {
    for (const [_, t] of Object.entries(translations)) {
      for (const key of channelKeys) {
        expect(t[key]).toBeString();
        expect(t[key].length).toBeGreaterThan(0);
      }
    }
  });

  test("contains expected locales", () => {
    const expected = ["en", "fr", "de", "es", "ja", "ko", "zh", "ar", "uk", "ru"];
    for (const locale of expected) {
      expect(translations[locale]).toBeDefined();
    }
  });

  test("has 77 locales", () => {
    expect(Object.keys(translations).length).toBe(77);
  });
});

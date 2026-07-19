import { describe, expect, it } from "bun:test";
import { ChannelNames } from "../src/channel-names";
import { translations, type ChannelTranslations } from "../src/channels";

const channelKeys: (keyof ChannelTranslations)[] = [
  "Hue", "Saturation", "Lightness", "Value", "Brightness",
  "Whiteness", "Blackness", "Chroma", "Red", "Green", "Blue", "Alpha",
];

describe("ChannelNames", () => {
  it("returns English labels", () => {
    const names = new ChannelNames("en");
    expect(names.of("hue")).toBe("Hue");
    expect(names.of("red")).toBe("Red");
    expect(names.of("alpha")).toBe("Alpha");
  });

  it("returns translated labels", () => {
    expect(new ChannelNames("uk").of("saturation")).toBe("Насиченість");
    expect(new ChannelNames("fr").of("red")).toBe("Rouge");
    expect(new ChannelNames("zh").of("blue")).toBe("蓝");
    expect(new ChannelNames("ja").of("hue")).toBe("色相");
    expect(new ChannelNames("de").of("lightness")).toBe("Helligkeit");
    expect(new ChannelNames("ar").of("green")).toBe("أخضر");
    expect(new ChannelNames("ko").of("alpha")).toBe("알파");
  });

  it("negotiates regional tags down to the base language", () => {
    expect(new ChannelNames("fr-CA").of("red")).toBe("Rouge");
    expect(new ChannelNames(["xh", "de-AT"]).of("lightness")).toBe("Helligkeit");
  });

  it("falls back to English for an unknown locale", () => {
    expect(new ChannelNames("xx").of("hue")).toBe("Hue");
    expect(new ChannelNames("zz-ZZ").of("red")).toBe("Red");
  });

  it("reports the negotiated locale", () => {
    expect(new ChannelNames("fr-CA").resolvedOptions()).toEqual({ locale: "fr" });
    expect(new ChannelNames("xx").resolvedOptions()).toEqual({ locale: "en" });
  });

  it("filters requested locales by support", () => {
    expect(ChannelNames.supportedLocalesOf(["ko-KR", "xh", "de"])).toEqual(["ko-KR", "de"]);
  });
});

describe("translations", () => {
  it("gives every locale all 12 channel keys", () => {
    for (const t of Object.values(translations)) {
      for (const key of channelKeys) {
        expect(t[key]).toBeString();
        expect(t[key].length).toBeGreaterThan(0);
      }
    }
  });

  it("has 77 locales", () => {
    expect(Object.keys(translations).length).toBe(77);
  });
});

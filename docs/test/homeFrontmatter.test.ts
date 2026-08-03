import { describe, expect, it } from "bun:test";
import {
  FEATURE_ICONS,
  SITE_LANGS,
  heroStrings,
  homeFrontmatter,
} from "../.vitepress/i18n/strings";

describe("homeFrontmatter", () => {
  it("feeds the stock hero from the shared strings", () => {
    const { hero } = homeFrontmatter("en");
    const s = heroStrings("en");
    expect(hero.name).toBe("<span class='hero-ur'>Ur</span>Color");
    expect(hero.text).toBe(s.tagline);
    expect(hero.tagline).toBe(s.lede);
  });

  it("keeps both calls to action, in the theme's own shape", () => {
    expect(homeFrontmatter("en").hero.actions).toEqual([
      { theme: "brand", text: "Get Started", link: "/guide/" },
      { theme: "alt", text: "Components", link: "/components/" },
    ]);
  });

  it("prefixes every link with the locale outside English", () => {
    const fm = homeFrontmatter("ru");
    expect(fm.hero.actions.map(a => a.link)).toEqual(["/ru/guide/", "/ru/components/"]);
    for (const f of fm.features) expect(f.link.startsWith("/ru/guide/features#")).toBe(true);
  });

  it("gives every locale a full card with an icon", () => {
    for (const lang of SITE_LANGS) {
      const { features } = homeFrontmatter(lang);
      expect(features).toHaveLength(FEATURE_ICONS.length);
      for (const f of features) {
        expect(f.title.length).toBeGreaterThan(0);
        expect(f.details.length).toBeGreaterThan(0);
        expect(f.icon).toStartWith("<svg");
      }
    }
  });

  it("falls back to English copy for a locale it has none for", () => {
    const fm = homeFrontmatter("xx");
    expect(fm.hero.text).toBe(heroStrings("en").tagline);
    expect(fm.features.map(f => f.title)).toEqual(
      homeFrontmatter("en").features.map(f => f.title),
    );
  });
});

import { describe, expect, it } from "bun:test";
import { searchFor } from "../.vitepress/i18n/nav";
import { SITE_LANGS } from "../.vitepress/i18n/strings";

describe("searchFor", () => {
  it("asks for the default theme's own local search", () => {
    expect(searchFor("en").provider).toBe("local");
  });

  it("translates the modal for every locale the site ships", () => {
    for (const lang of SITE_LANGS) {
      const { translations } = searchFor(lang).options;
      expect(translations.button.buttonText.length).toBeGreaterThan(0);
      expect(translations.modal.noResultsText.length).toBeGreaterThan(0);
      expect(translations.modal.footer.closeText.length).toBeGreaterThan(0);
    }
  });

  it("gives each locale its own button label", () => {
    expect(searchFor("ru").options.translations.button.buttonText).toBe("Поиск");
    expect(searchFor("ja").options.translations.button.buttonText).toBe("検索");
  });

  it("falls back to English for a locale it has no strings for", () => {
    expect(searchFor("xx")).toEqual(searchFor("en"));
  });
});

import { describe, expect, it } from "bun:test";
import { filterSupportedLocales, localeLadder, negotiateLocale } from "../../src/engine/locale";

describe("localeLadder", () => {
  it("strips subtags from most to least specific", () => {
    expect(localeLadder("zh-Hans-CN")).toEqual(["zh-Hans-CN", "zh-Hans", "zh"]);
  });

  it("returns a single rung for a bare tag", () => {
    expect(localeLadder("en")).toEqual(["en"]);
  });

  it("appends the lowercased primary subtag when casing differs", () => {
    // negotiateLocale's existing case-insensitive fallback: "ZH-Hant" must
    // still be able to reach a registered "zh".
    expect(localeLadder("ZH-Hant")).toEqual(["ZH-Hant", "ZH", "zh"]);
  });

  it("does not duplicate the primary subtag when it is already a rung", () => {
    expect(localeLadder("zh-Hant")).toEqual(["zh-Hant", "zh"]);
  });

  it("never emits an empty rung", () => {
    expect(localeLadder("")).toEqual([]);
    expect(localeLadder("en").every(rung => rung.length > 0)).toBe(true);
  });
});

describe("negotiateLocale (behaviour pinned before refactor)", () => {
  const available = ["en", "zh", "zh-Hant", "pt"];

  it("prefers an exact match", () => {
    expect(negotiateLocale("zh-Hant", available)).toBe("zh-Hant");
  });

  it("falls back by stripping subtags", () => {
    expect(negotiateLocale("pt-BR", available)).toBe("pt");
  });

  it("matches the primary subtag case-insensitively", () => {
    expect(negotiateLocale("EN-GB", available)).toBe("en");
  });

  it("takes the first requested tag that resolves", () => {
    expect(negotiateLocale(["xx", "pt-BR", "en"], available)).toBe("pt");
  });

  it("returns undefined when nothing resolves", () => {
    expect(negotiateLocale("xx", available)).toBeUndefined();
    expect(negotiateLocale([], available)).toBeUndefined();
  });

  it("accepts a bare string as well as an array", () => {
    expect(negotiateLocale("en", available)).toBe("en");
  });
});

describe("filterSupportedLocales", () => {
  const available = ["en", "zh"];

  it("keeps the caller's original tags", () => {
    expect(filterSupportedLocales(["en-GB", "zh", "xx"], available)).toEqual(["en-GB", "zh"]);
  });

  it("returns an empty array when nothing resolves", () => {
    expect(filterSupportedLocales(["xx"], available)).toEqual([]);
  });
});

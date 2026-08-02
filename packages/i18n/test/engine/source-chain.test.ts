import { beforeAll, describe, expect, it } from "bun:test";
import { registerSource, setDefaultSources } from "../../src/engine/registry";
import {
  chainLocales,
  normalizeChain,
  resolveSourceChain,
} from "../../src/engine/source-chain";
import type { NameSource } from "../../src/engine/types";

/** A registered source is all this module needs; the chunks are never loaded. */
function fakeSource(id: string, locales: string[]): NameSource {
  return {
    id,
    title: id,
    url: "https://example.invalid/",
    license: "CC0-1.0",
    citation: id,
    languages: Object.fromEntries(
      locales.map(locale => [locale, { model: "palette" as const, terms: 1, coverage: 1 }]),
    ),
  };
}

beforeAll(() => {
  // Mirrors the real shape: "narrow" is a strict subset of "broad", except
  // that "broad" also carries the script variant "zh-Hant" that "narrow"
  // can only reach by stripping to "zh".
  // Loaders are never invoked here — this module only reads `languages`.
  registerSource(fakeSource("narrow", ["en", "zh", "pt"]), {});
  registerSource(fakeSource("broad", ["en", "zh", "zh-Hant", "pt", "ka"]), {});
  setDefaultSources(["narrow", "broad"]);
});

describe("normalizeChain", () => {
  it("falls back to the registered default when given undefined", () => {
    expect(normalizeChain(undefined)).toEqual(["narrow", "broad"]);
  });

  it("wraps a single id", () => {
    expect(normalizeChain("broad")).toEqual(["broad"]);
  });

  it("copies an array so the caller cannot mutate it afterwards", () => {
    const mine = ["narrow"];
    const chain = normalizeChain(mine);
    mine.push("broad");
    expect(chain).toEqual(["narrow"]);
  });

  it("throws on an unknown id rather than silently skipping it", () => {
    // A typo must not degrade into a fallback that quietly answers from
    // some other source.
    expect(() => normalizeChain("nosuch")).toThrow(/nosuch/);
    expect(() => normalizeChain(["narrow", "nosuch"])).toThrow(/nosuch/);
  });

  it("throws on an empty chain", () => {
    expect(() => normalizeChain([])).toThrow(RangeError);
  });
});

describe("resolveSourceChain", () => {
  const chain = ["narrow", "broad"];

  it("prefers the first source in the chain when both have the locale", () => {
    expect(resolveSourceChain("en", chain)).toEqual({ source: "narrow", locale: "en" });
  });

  it("falls through to a later source for a locale the first lacks", () => {
    expect(resolveSourceChain("ka", chain)).toEqual({ source: "broad", locale: "ka" });
  });

  it("lets an exact rung in a later source beat a stripped rung in an earlier one", () => {
    // "zh-Hant" is exact in broad; narrow would only match by stripping to
    // "zh". The exact rung is reached first, so broad wins.
    expect(resolveSourceChain("zh-Hant", chain)).toEqual({ source: "broad", locale: "zh-Hant" });
  });

  it("still prefers the earlier source when the rung is exact in both", () => {
    expect(resolveSourceChain("zh", chain)).toEqual({ source: "narrow", locale: "zh" });
  });

  it("uses chain order once both sources only match by stripping", () => {
    expect(resolveSourceChain("pt-BR", chain)).toEqual({ source: "narrow", locale: "pt" });
  });

  it("honours a reversed chain", () => {
    expect(resolveSourceChain("en", ["broad", "narrow"])).toEqual({ source: "broad", locale: "en" });
  });

  it("keeps requested-tag order dominant over match quality", () => {
    // Intl semantics: an earlier requested tag's stripped match outranks a
    // later tag's exact match.
    expect(resolveSourceChain(["pt-BR", "ka"], chain)).toEqual({ source: "narrow", locale: "pt" });
  });

  it("returns undefined when no source has any requested locale", () => {
    expect(resolveSourceChain("xx", chain)).toBeUndefined();
    expect(resolveSourceChain([], chain)).toBeUndefined();
  });
});

describe("chainLocales", () => {
  it("unions the chain's locales without duplicates", () => {
    expect(chainLocales(["narrow", "broad"]).sort())
      .toEqual(["en", "ka", "pt", "zh", "zh-Hant"]);
  });

  it("returns a single source's locales unchanged", () => {
    expect(chainLocales(["narrow"]).sort()).toEqual(["en", "pt", "zh"]);
  });
});

import { beforeAll, describe, expect, it } from "bun:test";
import { Color } from "@urcolor/core";
import { ColorNames } from "../src/index";
import { registerSource, setDefaultSources } from "../src/engine/registry";
import type { PaletteChunk } from "../src/engine/types";

const BLUE = Color.parse("#3b82f6")!;

describe("ColorNames.load", () => {
  it("loads a full-model language and names a colour", async () => {
    const names = await ColorNames.load("ko", { source: "uwdata" });
    const name = names.of(BLUE);
    expect(name).toBeString();
    expect(name!.length).toBeGreaterThan(0);
  });

  it("negotiates a regional tag down to the base language", async () => {
    const names = await ColorNames.load("ko-KR", { source: "uwdata" });
    expect(names.resolvedOptions().locale).toBe("ko");
  });

  it("throws RangeError for an unsupported locale", async () => {
    // bun-types mistypes `.rejects.toThrow()` as returning `void`, though it
    // is a Promise at runtime and must be awaited for the assertion to run.
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await expect(ColorNames.load("xh", { source: "uwdata" })).rejects.toThrow(RangeError);
  });

  it("throws for an unknown source", async () => {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await expect(ColorNames.load("ko", { source: "nope" })).rejects.toThrow(/unknown source/i);
  });
});

describe("ColorNames constructor", () => {
  it("throws when the chunk has not been loaded", () => {
    expect(() => new ColorNames("ru", { source: "uwdata" })).toThrow(/ColorNames\.load/);
  });

  it("works synchronously once loaded", async () => {
    await ColorNames.load("en", { source: "uwdata" });
    expect(new ColorNames("en", { source: "uwdata" }).of(BLUE)).toBeString();
  });
});

describe("style option", () => {
  it("returns the display name for style long and the key for style short", async () => {
    const long = await ColorNames.load("ko", { source: "uwdata", style: "long" });
    const short = await ColorNames.load("ko", { source: "uwdata", style: "short" });
    expect(long.of(BLUE)).toBe(long.resolve(BLUE).candidates[0]!.name);
    expect(short.of(BLUE)).toBe(short.resolve(BLUE).candidates[0]!.term);
  });
});

describe("resolve", () => {
  it("returns candidates sorted by probability with full metadata", async () => {
    const names = await ColorNames.load("en", { source: "uwdata" });
    const result = names.resolve(BLUE);

    expect(result.source).toBe("uwdata");
    expect(result.model).toBe("full");
    expect(["exact", "nearest"]).toContain(result.coverage);
    expect(result.probability).toBeGreaterThan(0);
    expect(result.candidates.length).toBeGreaterThan(0);
    for (let i = 1; i < result.candidates.length; i++) {
      expect(result.candidates[i - 1]!.probability).toBeGreaterThanOrEqual(
        result.candidates[i]!.probability,
      );
    }
  });

  it("honours topN", async () => {
    const names = await ColorNames.load("en", { source: "uwdata", topN: 2 });
    expect(names.resolve(BLUE).candidates.length).toBeLessThanOrEqual(2);
  });
});

describe("fallback option", () => {
  it("returns undefined from of() on a nearest match when fallback is none, while resolve() still reports the true coverage", async () => {
    const nearest = await ColorNames.load("ro", { source: "uwdata", fallback: "nearest" });
    const strict = await ColorNames.load("ro", { source: "uwdata", fallback: "none" });

    // Found by walking a grid of Oklab values (L 0.1->0.9 step 0.05, a and b
    // -0.2->0.2 step 0.05) and taking the first that resolves as "nearest"
    // for Romanian: binDistance ~= 0.0707, nearest term "albastru". The
    // assertions below are unconditional on purpose; a guarded assertion
    // would let this test pass while testing nothing.
    const probe = Color.fromOklab(0.45, -0.05, -0.2);

    const nearestResult = nearest.resolve(probe);
    expect(nearestResult.coverage).toBe("nearest");
    expect(nearest.of(probe)).toBeString();

    // `fallback` only changes what of() does with a "nearest" result — it
    // must not change what resolve() reports. Both instances differ only in
    // `fallback`, so their resolve() output (coverage, binDistance,
    // candidates) must be identical; only of() may diverge.
    const strictResult = strict.resolve(probe);
    expect(strictResult.coverage).toBe("nearest");
    expect(strictResult.binDistance).toBe(nearestResult.binDistance);
    expect(strictResult.binDistance).toBeLessThan(Number.POSITIVE_INFINITY);
    expect(strictResult.candidates).toEqual(nearestResult.candidates);
    expect(strict.of(probe)).toBeUndefined();
  });
});

describe("hue-model languages", () => {
  it("names a saturated colour and refuses a grey", async () => {
    const names = await ColorNames.load("ar", { source: "uwdata" });
    expect(names.resolve(Color.parse("#ff0000")!).model).toBe("hue");
    expect(names.of(Color.parse("#808080")!)).toBeUndefined();
  });

  it("reports hueProjectionDistance for a real hue chunk, small for a saturated colour and large for a grey", async () => {
    const names = await ColorNames.load("ar", { source: "uwdata" });

    const vivid = names.resolve(Color.parse("#ff0000")!);
    expect(vivid.coverage).toBe("exact");
    expect(vivid.hueProjectionDistance).toBeDefined();
    expect(vivid.hueProjectionDistance!).toBeLessThan(0.05);

    const grey = names.resolve(Color.parse("#808080")!);
    expect(grey.coverage).toBe("none");
    expect(grey.hueProjectionDistance).toBeDefined();
    expect(grey.hueProjectionDistance!).toBeGreaterThan(0.2);
  });

  it("never reports fallback: none as filtering a hue-model result, since the hue model never returns nearest", async () => {
    const names = await ColorNames.load("ar", { source: "uwdata", fallback: "none" });
    const vivid = Color.parse("#ff0000")!;

    // A hue-model exact hit is unaffected by fallback either way.
    expect(names.resolve(vivid).coverage).toBe("exact");
    expect(names.of(vivid)).toBeString();
  });
});

describe("resolve: hueProjectionDistance is absent for full-model locales", () => {
  it("does not set hueProjectionDistance on a full-model result", async () => {
    const names = await ColorNames.load("ko", { source: "uwdata" });
    expect(names.resolve(BLUE).hueProjectionDistance).toBeUndefined();
  });
});

describe("reverse lookup", () => {
  it("returns a Color for a known term", async () => {
    const names = await ColorNames.load("ko", { source: "uwdata" });
    const term = names.resolve(BLUE).term!;
    const color = names.colorOf(term);
    expect(color).toBeInstanceOf(Color);
  });

  it("returns undefined for an unknown term", async () => {
    const names = await ColorNames.load("ko", { source: "uwdata" });
    expect(names.colorOf("definitely-not-a-korean-colour-term")).toBeUndefined();
  });

  it("returns the term's representative pCT alongside color/term/name", async () => {
    const names = await ColorNames.load("ko", { source: "uwdata" });
    const term = names.resolve(BLUE).term!;
    const result = names.resolveColorOf(term);

    expect(result).toBeDefined();
    expect(result!.pCT).toBeTypeOf("number");
    expect(result!.pCT).toBeGreaterThan(0);
    expect(result!.pCT).toBeLessThanOrEqual(1);
  });
});

describe("colorOf: Unicode normalisation (NFC/NFD)", () => {
  // Upstream shipped some Hangul terms in NFD (decomposed); anything a
  // caller types, pastes, or writes as a source literal is NFC (composed).
  // Built from explicit code points, not source literals, so the fixture's
  // normalisation form can't be silently altered by an editor or git filter.
  // Real term: Korean "파랑" ("blue"), present in the actual generated ko
  // chunk — a synthetic fixture would not exercise the real data path.
  const NFC_TERM = String.fromCharCode(0xd30c, 0xb791);
  const NFD_TERM = String.fromCharCode(0x1111, 0x1161, 0x1105, 0x1161, 0x11bc);

  it("resolves a Korean term passed in both NFC and NFD form to the same colour", async () => {
    expect(NFC_TERM).not.toBe(NFD_TERM);
    expect(NFD_TERM.normalize("NFC")).toBe(NFC_TERM);

    const names = await ColorNames.load("ko", { source: "uwdata" });
    const viaNfc = names.colorOf(NFC_TERM);
    const viaNfd = names.colorOf(NFD_TERM);

    expect(viaNfc).toBeInstanceOf(Color);
    expect(viaNfd).toBeInstanceOf(Color);
    expect(viaNfd?.to("oklab").coords).toEqual(viaNfc?.to("oklab").coords);
  });
});

describe("supportedLocalesOf", () => {
  it("filters requested tags to those the source covers", () => {
    const supported = ColorNames.supportedLocalesOf(["ko-KR", "xh", "de"], { source: "uwdata" });
    expect(supported).toEqual(["ko-KR", "de"]);
  });
});

describe("known limitation: white falls back into a pale chromatic bin", () => {
  // Pure white sits in a near-degenerate top bin with almost no data, so the
  // nearest-bin search reaches sideways into a pale chromatic bin instead.
  // This is honestly labelled (coverage: "nearest", with a binDistance) but
  // the default settings answer confidently with a name that is not white.
  // These tests pin the measured behaviour rather than hide it.
  const WHITE = Color.parse("#ffffff")!;

  it("resolves #ffffff to a light-pink term for Korean", async () => {
    const names = await ColorNames.load("ko", { source: "uwdata" });
    const result = names.resolve(WHITE);

    expect(result.coverage).toBe("nearest");
    // Shipped data is normalised to NFC at generation time (see
    // scripts/sync-uwdata/transform.ts), but normalize before comparing
    // anyway so this assertion isn't sensitive to the composition form of
    // the literal below, wherever it's read from.
    expect(result.name?.normalize("NFC")).toBe("연분홍색".normalize("NFC"));
    expect(result.term?.normalize("NFC")).toBe("연분홍".normalize("NFC"));
    // Measured distance from #ffffff's Oklab bin to the nearest populated
    // bin's centre.
    expect(result.binDistance).toBeCloseTo(0.05, 5);
  });

  it("resolves #ffffff to a light-blue term for Chinese", async () => {
    const names = await ColorNames.load("zh", { source: "uwdata" });
    const result = names.resolve(WHITE);

    expect(result.coverage).toBe("nearest");
    expect(result.name).toBe("浅蓝色");
    expect(result.term).toBe("浅蓝");
    expect(result.binDistance).toBeCloseTo(0.0707, 4);
  });
});

describe("resolvedOptions", () => {
  it("reports the negotiated locale, model, and defaults", async () => {
    const names = await ColorNames.load("ko", { source: "uwdata" });
    expect(names.resolvedOptions()).toMatchObject({
      locale: "ko",
      source: "uwdata",
      model: "full",
      style: "long",
      fallback: "nearest",
    });
  });
});

describe("palette model", () => {
  const paletteChunk: PaletteChunk = {
    lang: "en",
    model: "palette",
    terms: [
      ["yellow", "yellow", [...Color.parse("#FFFF00")!.to("oklab").coords] as [number, number, number], null],
      ["white", "white", [...Color.parse("#FFFFFF")!.to("oklab").coords] as [number, number, number], null],
    ],
    provenance: [["Q943", "FFFF00"], ["Q23444", "FFFFFF"]],
    aliases: { "color yellow": 0, "yellow color": 0 },
  };

  beforeAll(() => {
    registerSource(
      {
        id: "test-palette",
        title: "Test Palette",
        url: "https://example.invalid/",
        license: "CC0-1.0",
        citation: "Test",
        languages: { en: { model: "palette", terms: 2, coverage: 1 } },
      },
      { en: () => Promise.resolve({ default: paletteChunk }) },
    );
  });

  it("names an exact catalogued colour", async () => {
    const names = await ColorNames.load("en", { source: "test-palette" });
    expect(names.of(Color.parse("#FFFF00")!)).toBe("yellow");
    expect(names.resolve(Color.parse("#FFFF00")!).coverage).toBe("exact");
  });

  it("reports the palette model in resolvedOptions with no binSize", async () => {
    const names = await ColorNames.load("en", { source: "test-palette" });
    expect(names.resolvedOptions().model).toBe("palette");
    expect(names.resolvedOptions().binSize).toBeUndefined();
  });

  it("falls back to the nearest catalogued colour", async () => {
    const names = await ColorNames.load("en", { source: "test-palette" });
    const result = names.resolve(Color.parse("#FFFEF0")!);
    expect(result.coverage).toBe("nearest");
    expect(result.name).toBe("white");
    expect(result.binDistance).toBeGreaterThan(0);
  });

  it("withholds a nearest match when fallback is none", async () => {
    const names = await ColorNames.load("en", { source: "test-palette", fallback: "none" });
    expect(names.of(Color.parse("#FFFEF0")!)).toBeUndefined();
    // resolve() still reports the truth regardless of fallback.
    expect(names.resolve(Color.parse("#FFFEF0")!).name).toBe("white");
  });

  it("reverse-looks-up by term", async () => {
    const names = await ColorNames.load("en", { source: "test-palette" });
    // Oklab round-trips exactly for these values; verified against @urcolor/core.
    expect(names.colorOf("yellow")?.toString("hex")).toBe("#ffff00");
  });

  it("reverse-looks-up by alias", async () => {
    const names = await ColorNames.load("en", { source: "test-palette" });
    expect(names.resolveColorOf("color yellow")?.term).toBe("yellow");
    expect(names.resolveColorOf("YELLOW COLOR")?.term).toBe("yellow");
  });

  it("returns undefined for an unknown alias", async () => {
    const names = await ColorNames.load("en", { source: "test-palette" });
    expect(names.resolveColorOf("not a colour")).toBeUndefined();
  });
});

describe("source chains", () => {
  const chunkFor = (lang: string): PaletteChunk => ({
    lang,
    model: "palette",
    terms: [["yellow", "yellow", [...Color.parse("#FFFF00")!.to("oklab").coords] as [number, number, number], null]],
    provenance: [["Q943", "FFFF00"]],
    aliases: {},
  });

  beforeAll(() => {
    registerSource(
      {
        id: "chain-narrow",
        title: "Narrow",
        url: "https://example.invalid/",
        license: "CC0-1.0",
        citation: "Narrow",
        languages: { en: { model: "palette", terms: 1, coverage: 1 }, zh: { model: "palette", terms: 1, coverage: 1 } },
      },
      { en: () => Promise.resolve({ default: chunkFor("en") }), zh: () => Promise.resolve({ default: chunkFor("zh") }) },
    );
    registerSource(
      {
        id: "chain-broad",
        title: "Broad",
        url: "https://example.invalid/",
        license: "CC0-1.0",
        citation: "Broad",
        languages: {
          "en": { model: "palette", terms: 1, coverage: 1 },
          "zh": { model: "palette", terms: 1, coverage: 1 },
          "zh-Hant": { model: "palette", terms: 1, coverage: 1 },
          "ka": { model: "palette", terms: 1, coverage: 1 },
        },
      },
      {
        "en": () => Promise.resolve({ default: chunkFor("en") }),
        "zh": () => Promise.resolve({ default: chunkFor("zh") }),
        "zh-Hant": () => Promise.resolve({ default: chunkFor("zh-Hant") }),
        "ka": () => Promise.resolve({ default: chunkFor("ka") }),
      },
    );
    // A third, otherwise-unrelated source that also answers "ka". Used only
    // by the options-mutation-during-await test below: its chunk is loaded
    // ahead of time so it is already cached, which is what makes the buggy
    // re-resolution silently succeed (from the wrong dataset) instead of
    // throwing — the worse of the two bad outcomes the fix guards against.
    registerSource(
      {
        id: "chain-third",
        title: "Third",
        url: "https://example.invalid/",
        license: "CC0-1.0",
        citation: "Third",
        languages: { ka: { model: "palette", terms: 1, coverage: 1 } },
      },
      { ka: () => Promise.resolve({ default: chunkFor("ka") }) },
    );
    setDefaultSources(["chain-narrow", "chain-broad"]);
  });

  it("uses the default chain when source is omitted entirely", async () => {
    const names = await ColorNames.load("ka");
    expect(names.resolvedOptions().source).toBe("chain-broad");
    expect(names.resolvedOptions().locale).toBe("ka");
  });

  it("prefers the first source in the default chain", async () => {
    const names = await ColorNames.load("en");
    expect(names.resolvedOptions().source).toBe("chain-narrow");
  });

  it("reports the whole chain it considered", async () => {
    const names = await ColorNames.load("en");
    expect(names.resolvedOptions().sources).toEqual(["chain-narrow", "chain-broad"]);
  });

  it("reports a single-element chain when pinned to one source", async () => {
    const names = await ColorNames.load("en", { source: "chain-broad" });
    expect(names.resolvedOptions().source).toBe("chain-broad");
    expect(names.resolvedOptions().sources).toEqual(["chain-broad"]);
  });

  it("keeps single-source behaviour unchanged, including the throw", async () => {
    // Backwards compatibility: pinning to a source that lacks the locale
    // must still reject rather than quietly falling back.
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await expect(ColorNames.load("ka", { source: "chain-narrow" })).rejects.toThrow(RangeError);
  });

  it("honours an explicit chain", async () => {
    const names = await ColorNames.load("ka", { source: ["chain-narrow", "chain-broad"] });
    expect(names.resolvedOptions().source).toBe("chain-broad");
  });

  it("honours a reversed chain", async () => {
    const names = await ColorNames.load("en", { source: ["chain-broad", "chain-narrow"] });
    expect(names.resolvedOptions().source).toBe("chain-broad");
  });

  it("lets an exact tag in a later source beat a stripped match in an earlier one", async () => {
    const names = await ColorNames.load("zh-Hant");
    expect(names.resolvedOptions().source).toBe("chain-broad");
    expect(names.resolvedOptions().locale).toBe("zh-Hant");
  });

  it("names every source tried when nothing resolves", async () => {
    const attempt = ColorNames.load("xx");
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await expect(attempt).rejects.toThrow(RangeError);
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await expect(attempt).rejects.toThrow(/chain-narrow/);
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await expect(attempt).rejects.toThrow(/chain-broad/);
  });

  it("rejects an empty chain rather than treating it as the default", async () => {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await expect(ColorNames.load("en", { source: [] })).rejects.toThrow(RangeError);
  });

  it("rejects an unknown source id", async () => {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await expect(ColorNames.load("en", { source: ["chain-narrow", "nosuch"] })).rejects.toThrow(/nosuch/);
  });

  it("unions the chain's locales in supportedLocalesOf", () => {
    expect(ColorNames.supportedLocalesOf(["ka", "en", "xx"])).toEqual(["ka", "en"]);
  });

  it("filters against a single source when one is named", () => {
    expect(ColorNames.supportedLocalesOf(["ka", "en"], { source: "chain-narrow" })).toEqual(["en"]);
  });

  it("still answers lookups from the source that won", async () => {
    const names = await ColorNames.load("ka");
    expect(names.of(Color.parse("#FFFF00")!)).toBe("yellow");
    expect(names.resolve(Color.parse("#FFFF00")!).source).toBe("chain-broad");
  });

  it("is immune to the caller mutating options.source during the await window", async () => {
    // Pre-load a third source's "ka" chunk so it is already cached. This is
    // what would let a re-resolution against the mutated options silently
    // succeed from the wrong dataset, rather than throwing — the worse of
    // the two bad outcomes a live re-read of `options` would allow.
    await ColorNames.load("ka", { source: "chain-third" });

    const opts: { source: string | readonly string[] } = { source: ["chain-narrow", "chain-broad"] };
    const pending = ColorNames.load("ka", opts);
    opts.source = "chain-third";
    const names = await pending;

    expect(names.resolvedOptions().source).toBe("chain-broad");
    expect(names.resolvedOptions().sources).toEqual(["chain-narrow", "chain-broad"]);
    expect(names.resolvedOptions().locale).toBe("ka");
  });
});

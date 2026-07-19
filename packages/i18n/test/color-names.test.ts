import { describe, expect, it } from "bun:test";
import { Color } from "@urcolor/core";
import { ColorNames } from "../src/index";

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

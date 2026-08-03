/**
 * Guards for the optimised paths.
 *
 * Each of these replaced a slow-but-obviously-correct implementation with a
 * faster one that has to produce *identical* output, not merely close output.
 * These tests pin the equivalence, so a future edit that trades accuracy for
 * speed fails here rather than silently shifting everyone's colors.
 */

import { describe, expect, test } from "bun:test";
import { num, parseFn } from "../../src/color/components";
import { NAMED_COLORS, parseNamed } from "../../src/color/named";
import { registerParser, tryParse } from "../../src/color/parse";
import { channelIndexOf, SPACES } from "../../src/color/registry";
import { serialize } from "../../src/color/serialize";
import { parseHex } from "../../src/color/spaces/srgb";
import type { SpaceId } from "../../src/color/types";

/** The definition `num` optimises: round to `prec` decimals, drop trailing zeros. */
const reference = (n: number, prec: number): number => Number.parseFloat(n.toFixed(prec));

describe("num — exact equivalence with parseFloat(toFixed())", () => {
  /** Deterministic PRNG, so a failure is always reproducible. */
  function rng(seed: number): () => number {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  test("agrees on exact dyadic ties, where naive rounding does not", () => {
    // `-1.25` to one decimal is `-1.3`: toFixed rounds ties away from zero,
    // while `Math.round(n * 10) / 10` would round toward +∞ and give `-1.2`.
    for (const prec of [0, 1, 2, 3, 4, 5]) {
      for (let k = -400; k <= 400; k++) {
        for (const frac of [0.5, 0.25, 0.125, 0.0625, 0.03125]) {
          for (const sign of [1, -1]) {
            const v = sign * (k + frac);
            expect(num(v, prec)).toBe(reference(v, prec));
          }
        }
      }
    }
  });

  test("agrees on decimal half-way values at the rounding boundary", () => {
    for (const prec of [4, 5]) {
      const step = 10 ** -prec;
      for (let k = -2000; k <= 2000; k++) {
        for (const v of [k * step + step / 2, -(k * step + step / 2), k * step, k * step + step / 4]) {
          expect(num(v, prec)).toBe(reference(v, prec));
        }
      }
    }
  });

  test("agrees across the coordinate ranges the serialisers actually use", () => {
    const rand = rng(0xc01c0107);
    for (let i = 0; i < 200_000; i++) {
      const v = rand() * 800 - 400;
      for (const prec of [4, 5]) expect(num(v, prec)).toBe(reference(v, prec));
    }
  });

  test("agrees on subnormals, huge magnitudes and non-finite input", () => {
    const cases = [
      0, -0, 1, -1, Number.MIN_VALUE, -Number.MIN_VALUE, Number.EPSILON,
      1e-7, -1e-7, 1e15, -1e15, 1e21, -1e21, 1e300, Number.MAX_VALUE,
      Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY,
    ];
    for (const v of cases) {
      for (const prec of [0, 4, 5]) {
        const a = num(v, prec);
        const b = reference(v, prec);
        // Object.is so NaN and -0 compare structurally, not by ===.
        expect(Object.is(a, b)).toBe(true);
      }
    }
  });

  test("preserves the sign of zero exactly as toFixed does", () => {
    expect(Object.is(num(-0, 4), reference(-0, 4))).toBe(true);
    expect(Object.is(num(-1e-9, 4), reference(-1e-9, 4))).toBe(true);
  });

  test("falls back for a precision outside the lookup table", () => {
    for (const prec of [6, 10, 12, 20]) {
      expect(num(1 / 3, prec)).toBe(reference(1 / 3, prec));
      expect(num(-1234.56789, prec)).toBe(reference(-1234.56789, prec));
    }
  });
});

describe("parseFn — cached patterns stay stateless", () => {
  test("repeated calls on the same notation give the same answer", () => {
    // A cached RegExp carrying `lastIndex` state would fail on the second call.
    for (let i = 0; i < 5; i++) {
      expect(parseFn("rgb(1 2 3)", "rgba?")?.args).toEqual(["1", "2", "3"]);
      expect(parseFn("hsl(1 2 3)", "rgba?")).toBeNull();
    }
  });

  test("distinct notation names do not share a compiled pattern", () => {
    expect(parseFn("lab(1 2 3)", "lab")?.args).toEqual(["1", "2", "3"]);
    expect(parseFn("lab(1 2 3)", "oklab")).toBeNull();
    expect(parseFn("oklab(1 2 3)", "oklab")?.args).toEqual(["1", "2", "3"]);
    expect(parseFn("oklab(1 2 3)", "lab")).toBeNull();
  });
});

describe("parse dispatch — same acceptances and rejections as a full scan", () => {
  test("every functional notation still reaches its parser", () => {
    const cases: [string, SpaceId][] = [
      ["rgb(255 0 0)", "srgb"], ["rgba(255, 0, 0, 0.5)", "srgb"],
      ["hsl(120 100% 50%)", "hsl"], ["hsla(120, 100%, 50%, 0.5)", "hsl"],
      ["hwb(120 0% 0%)", "hwb"], ["lab(50 0 0)", "lab"], ["lch(50 20 30)", "lch"],
      ["oklab(0.5 0 0)", "oklab"], ["oklch(0.5 0.1 30)", "oklch"],
      ["color(display-p3 1 0 0)", "display-p3"], ["color(xyz 1 0 0)", "xyz-d65"],
    ];
    for (const [input, space] of cases) {
      expect(tryParse(input)?.space).toBe(space);
      expect(tryParse(input.toUpperCase())?.space).toBe(space);
      expect(tryParse(`   ${input}   `)?.space).toBe(space);
    }
  });

  test("`oklab`/`oklch` are not captured by the `lab`/`lch` dispatch keys", () => {
    expect(tryParse("oklab(0.5 0 0)")?.space).toBe("oklab");
    expect(tryParse("oklch(0.5 0.1 30)")?.space).toBe("oklch");
  });

  test("still rejects malformed and unknown notations", () => {
    for (const bad of [
      "", " ", "not-a-color", "#", "#12", "#12345", "#gggggg",
      "rgb(", "rgb()", "rgb(1 2)", "rgb 1 2 3", "rgb(1 2 3",
      "notafn(1 2 3)", "()", "(1 2 3)", "1 2 3", "reddish",
      "color(bogus 1 2 3)", "currentColor", "inherit",
    ]) {
      expect(tryParse(bad)).toBeNull();
    }
  });

  test("a space between the name and the paren is still not a color", () => {
    expect(tryParse("rgb (1 2 3)")).toBeNull();
  });

  test("a shape-matching but non-numeric notation falls through to plugins", () => {
    // Relative color syntax depends on this: `hsl(...)` matches the hsl parser
    // by shape, yields NaN coords, and must still reach a registered parser.
    expect(tryParse("hsl(from red h s l)")).toBeNull();

    const dispose = registerParser(input =>
      input.includes("from") ? { space: "srgb", coords: [0.5, 0.5, 0.5], alpha: 1 } : null);
    try {
      expect(tryParse("hsl(from red h s l)")?.coords).toEqual([0.5, 0.5, 0.5]);
      // A plugin must not be able to shadow a built-in notation.
      expect(tryParse("rgb(255 0 0)")?.coords).toEqual([1, 0, 0]);
    } finally {
      dispose();
    }
    expect(tryParse("hsl(from red h s l)")).toBeNull();
  });

  test("a throwing plugin does not break parsing", () => {
    const dispose = registerParser(() => {
      throw new Error("boom");
    });
    try {
      expect(tryParse("red")?.coords).toEqual([1, 0, 0]);
      expect(tryParse("nonsense")).toBeNull();
    } finally {
      dispose();
    }
  });
});

describe("named colors — precomputed table matches decoding the hex", () => {
  test("every keyword resolves to exactly its hex literal", () => {
    for (const [key, hex] of Object.entries(NAMED_COLORS)) {
      expect(parseNamed(key)).toEqual(parseHex(hex));
      expect(parseNamed(key.toUpperCase())).toEqual(parseHex(hex));
    }
  });

  test("returns a fresh, independently mutable object each call", () => {
    const a = parseNamed("red")!;
    const b = parseNamed("red")!;
    expect(a).not.toBe(b);
    expect(a.coords).not.toBe(b.coords);
    a.coords[0] = 0.123;
    expect(parseNamed("red")!.coords[0]).toBe(1);
  });

  test("transparent and unknown keywords are unchanged", () => {
    expect(parseNamed("transparent")).toEqual({ space: "srgb", coords: [0, 0, 0], alpha: 0 });
    expect(parseNamed("nosuchcolor")).toBeNull();
  });
});

describe("channelIndexOf — matches a linear scan of the channel list", () => {
  test("agrees with indexOf for every space and channel", () => {
    for (const [id, def] of Object.entries(SPACES)) {
      for (const name of def.channels) {
        expect(channelIndexOf(id as SpaceId, name)).toBe(def.channels.indexOf(name));
      }
      for (const missing of ["q", "nope", "", "0"]) {
        expect(channelIndexOf(id as SpaceId, missing)).toBe(-1);
      }
    }
  });

  test("inherited Object properties are not mistaken for channels", () => {
    for (const key of ["constructor", "toString", "hasOwnProperty", "__proto__", "valueOf"]) {
      expect(channelIndexOf("srgb", key)).toBe(-1);
    }
  });
});

describe("serializeHex — lookup table matches the formatting it replaced", () => {
  test("covers every byte value", () => {
    for (let i = 0; i < 256; i++) {
      const v = i / 255;
      expect(serialize({ space: "srgb", coords: [v, v, v], alpha: 1 }, "hex"))
        .toBe(`#${i.toString(16).padStart(2, "0").repeat(3)}`);
    }
  });

  test("clamps out-of-range coordinates as before", () => {
    expect(serialize({ space: "srgb", coords: [-1, 2, 0.5], alpha: 1 }, "hex")).toBe("#00ff80");
    expect(serialize({ space: "srgb", coords: [0, 1, 0.5], alpha: 0.5 }, "hex")).toBe("#00ff8080");
  });
});

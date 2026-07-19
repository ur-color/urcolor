import { describe, expect, it } from "bun:test";
import { NOTATIONS, parseChannelToken } from "@urcolor/core";
import { evaluateMath, type MathScope } from "../src/math";

const n = (value: number): { value: number; percent: boolean } => ({ value, percent: false });
const scope: MathScope = { h: n(0), s: n(100), l: n(50), alpha: n(1) };

const val = (input: string): number | null => evaluateMath(input, scope)?.value ?? null;

describe("evaluateMath — literals and keywords", () => {
  it("reads bare numbers", () => {
    expect(val("42")).toBe(42);
    expect(val("-1.5")).toBeCloseTo(-1.5, 9);
    expect(val("+3")).toBe(3);
  });

  it("reads channel keywords from scope", () => {
    expect(val("l")).toBe(50);
    expect(val("alpha")).toBe(1);
  });

  it("treats none as 0", () => {
    expect(val("none")).toBe(0);
  });

  it("normalises angle units to degrees", () => {
    expect(val("0.5turn")).toBeCloseTo(180, 9);
    expect(val("200grad")).toBeCloseTo(180, 9);
    expect(val("90deg")).toBeCloseTo(90, 9);
  });

  it("marks percentages", () => {
    const r = evaluateMath("50%", scope);
    expect(r).toEqual({ value: 50, percent: true });
  });

  it("returns null for an unknown identifier", () => {
    expect(evaluateMath("nope", scope)).toBeNull();
  });
});

describe("evaluateMath — arithmetic", () => {
  it("applies * / before + -", () => {
    expect(val("calc(2 + 3 * 4)")).toBe(14);
    expect(val("calc(10 - 6 / 2)")).toBe(7);
  });

  it("honours parentheses", () => {
    expect(val("calc((2 + 3) * 4)")).toBe(20);
  });

  it("computes with channel keywords", () => {
    expect(val("calc(h + 180)")).toBe(180);
    expect(val("calc(l * 2)")).toBe(100);
  });

  it("handles unary signs inside expressions", () => {
    expect(val("calc(-l + 100)")).toBe(50);
  });

  it("returns null on division by zero", () => {
    expect(evaluateMath("calc(1 / 0)", scope)).toBeNull();
    expect(evaluateMath("calc(1 / h)", scope)).toBeNull();
  });

  it("returns null on unbalanced parentheses", () => {
    expect(evaluateMath("calc(1 + 2", scope)).toBeNull();
    expect(evaluateMath("calc(1 + 2))", scope)).toBeNull();
  });
});

describe("evaluateMath — functions", () => {
  it("evaluates clamp, min and max", () => {
    expect(val("clamp(0, 5, 10)")).toBe(5);
    expect(val("clamp(0, -5, 10)")).toBe(0);
    expect(val("clamp(0, 50, 10)")).toBe(10);
    expect(val("min(3, 1, 2)")).toBe(1);
    expect(val("max(3, 1, 2)")).toBe(3);
  });

  it("nests functions arbitrarily", () => {
    expect(val("clamp(0, calc(l * 3), min(100, 120))")).toBe(100);
    expect(val("calc(max(1, 2) * min(3, 4))")).toBe(6);
  });

  it("returns null when clamp has the wrong argument count", () => {
    expect(evaluateMath("clamp(0, 5)", scope)).toBeNull();
    expect(evaluateMath("clamp(0, 5, 10, 15)", scope)).toBeNull();
  });
});

describe("evaluateMath — number/percentage algebra", () => {
  it("adds like types", () => {
    expect(evaluateMath("calc(10% + 20%)", scope)).toEqual({ value: 30, percent: true });
    expect(evaluateMath("calc(10 + 20)", scope)).toEqual({ value: 30, percent: false });
  });

  it("rejects mixing number and percentage under + -", () => {
    expect(evaluateMath("calc(10 + 20%)", scope)).toBeNull();
    expect(evaluateMath("calc(20% - 10)", scope)).toBeNull();
  });

  it("multiplies a percentage by a number", () => {
    expect(evaluateMath("calc(50% * 2)", scope)).toEqual({ value: 100, percent: true });
    expect(evaluateMath("calc(2 * 50%)", scope)).toEqual({ value: 100, percent: true });
  });

  it("divides a percentage by a number", () => {
    expect(evaluateMath("calc(50% / 2)", scope)).toEqual({ value: 25, percent: true });
  });

  it("rejects dividing by a percentage", () => {
    expect(evaluateMath("calc(10 / 50%)", scope)).toBeNull();
  });

  it("rejects mixed types in clamp/min/max", () => {
    expect(evaluateMath("min(10, 20%)", scope)).toBeNull();
  });

  it("rejects a percentage multiplied by a percentage", () => {
    expect(evaluateMath("calc(50% * 50%)", scope)).toBeNull();
  });

  it("rejects clamp with a mix of percentage and number arguments", () => {
    expect(evaluateMath("clamp(0%, 50, 100%)", scope)).toBeNull();
  });
});

describe("evaluateMath — left-associativity", () => {
  it("evaluates chained `-` left to right", () => {
    expect(val("calc(10 - 3 - 2)")).toBe(5);
    expect(val("calc(1-2-3-4)")).toBe(-8);
    expect(val("calc(2 - 3 + 4)")).toBe(3);
  });

  it("evaluates chained `/` and mixed `* /` left to right", () => {
    expect(val("calc(100 / 5 / 2)")).toBe(10);
    expect(val("calc(100 / 5 * 2)")).toBe(40);
  });
});

describe("evaluateMath — whole-input consumption", () => {
  it("rejects trailing or malformed input instead of parsing a prefix", () => {
    expect(evaluateMath("1 2", scope)).toBeNull();
    expect(evaluateMath("calc(1) junk", scope)).toBeNull();
    expect(evaluateMath("()", scope)).toBeNull();
    expect(evaluateMath("", scope)).toBeNull();
    expect(evaluateMath("   ", scope)).toBeNull();
    expect(evaluateMath(",", scope)).toBeNull();
    expect(evaluateMath("1,2", scope)).toBeNull();
    expect(evaluateMath("calc(1)(2)", scope)).toBeNull();
    expect(evaluateMath("(1))", scope)).toBeNull();
    expect(evaluateMath("calc", scope)).toBeNull();
  });
});

describe("evaluateMath — case-insensitivity", () => {
  it("folds case for function names and keywords", () => {
    expect(val("CALC(1 + 1)")).toBe(2);
    expect(val("Clamp(0, 5, 10)")).toBe(5);
    expect(val("MIN(1, 2)")).toBe(1);
    expect(val("NONE")).toBe(0);
  });

  it("folds case for angle units", () => {
    expect(val("0.5TURN")).toBeCloseTo(180, 9);
    expect(val("1Rad")).toBeCloseTo(57.29577951308232, 9);
  });
});

describe("evaluateMath — non-finite results", () => {
  it("returns null instead of NaN or Infinity", () => {
    expect(evaluateMath("calc(0 / 0)", scope)).toBeNull();
    expect(evaluateMath("calc(-1 / 0)", scope)).toBeNull();
    expect(evaluateMath("1e400", scope)).toBeNull();
    expect(evaluateMath("calc(1e308 * 10)", scope)).toBeNull();
    expect(evaluateMath("calc(1e308 + 1e308)", scope)).toBeNull();
  });
});

describe("evaluateMath — angle parity with @urcolor/core", () => {
  // `parseHue` itself isn't exported from @urcolor/core's public surface, but
  // `parseChannelToken` is, and passing it a hue-flagged NotationChannel
  // (e.g. NOTATIONS.hsl.channels[0]) routes through the same `parseHue` logic
  // internally — so this still checks against core's real angle handling
  // rather than a hard-coded duplicate of it.
  const hueChannel = NOTATIONS.hsl!.channels[0];

  it("matches core's angle-to-degrees conversion for every supported unit", () => {
    for (const token of ["0.5turn", "200grad", "1rad", "90deg", "45"]) {
      expect(val(token)).toBeCloseTo(parseChannelToken(token, hueChannel), 9);
    }
  });

  it("does not silently drop an unrecognised unit", () => {
    expect(evaluateMath("5px", scope)).toBeNull();
  });
});

describe("evaluateMath — unary edge cases", () => {
  it("resolves chains of unary signs", () => {
    expect(val("calc(--3)")).toBe(3);
    expect(val("calc(-+-3)")).toBe(3);
    expect(val("calc(+-+2)")).toBe(-2);
  });

  it("applies unary minus alongside binary operators", () => {
    expect(val("calc(2 * -3)")).toBe(-6);
    expect(val("calc(3 - -2)")).toBe(5);
  });

  it("keeps the percent flag on a unary-negated percentage", () => {
    expect(evaluateMath("-50%", scope)).toEqual({ value: -50, percent: true });
  });
});

describe("evaluateMath — bare-expression entry", () => {
  it("accepts arithmetic without a calc() wrapper", () => {
    expect(val("1 + 2")).toBe(3);
  });

  it("lexes a hyphenated identifier as one token, not subtraction", () => {
    expect(evaluateMath("s-l", scope)).toBeNull();
  });
});

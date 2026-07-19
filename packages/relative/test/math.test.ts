import { describe, expect, it } from "bun:test";
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
});

import { describe, it, expect } from "bun:test";
import { Color } from "@urcolor/core";
import {
  ALPHA_CONFIG, parseColor, resolveChannelConfig,
  colorToDisplayValue, applyDisplayValue, applyDisplayValues,
} from "../src/channel-model";

const BLUE = Color.parse("hsl(210, 80%, 50%)")!;

describe("parseColor", () => {
  it("passes a Color through", () => {
    expect(parseColor(BLUE)).toBe(BLUE);
  });
  it("parses a string", () => {
    expect(parseColor("red")?.toString("hex")).toBe(Color.parse("red")!.toString("hex"));
  });
  it("returns undefined for empty input", () => {
    expect(parseColor(null)).toBeUndefined();
    expect(parseColor(undefined)).toBeUndefined();
    expect(parseColor("")).toBeUndefined();
  });
  it("returns undefined for an unparseable string", () => {
    expect(parseColor("not-a-color")).toBeUndefined();
  });
});

describe("resolveChannelConfig", () => {
  it("returns the alpha config for the alpha channel", () => {
    expect(resolveChannelConfig("hsl", "alpha")).toEqual(ALPHA_CONFIG);
  });
  it("returns the space config for a real channel", () => {
    expect(resolveChannelConfig("hsl", "h")?.key).toBe("h");
  });
  it("returns undefined for an unknown channel", () => {
    expect(resolveChannelConfig("hsl", "zzz")).toBeUndefined();
  });
});

describe("colorToDisplayValue", () => {
  it("reads a channel in display units", () => {
    expect(Math.round(colorToDisplayValue(BLUE, "hsl", "h"))).toBe(210);
  });
  it("reads alpha as a 0-100 percentage", () => {
    expect(colorToDisplayValue(BLUE.withAlpha(0.5), "hsl", "alpha")).toBe(50);
  });
});

describe("applyDisplayValue", () => {
  it("round-trips a channel through display units", () => {
    const next = applyDisplayValue(BLUE, "hsl", "h", 120);
    expect(Math.round(colorToDisplayValue(next, "hsl", "h"))).toBe(120);
  });
  it("writes alpha through withAlpha", () => {
    expect(applyDisplayValue(BLUE, "hsl", "alpha", 25).alpha).toBeCloseTo(0.25, 5);
  });
  it("returns the input unchanged for an unknown channel", () => {
    expect(applyDisplayValue(BLUE, "hsl", "zzz", 1)).toBe(BLUE);
  });
});

describe("applyDisplayValues", () => {
  it("writes several channels at once", () => {
    const next = applyDisplayValues(BLUE, "hsl", ["h", "s"], [120, 50]);
    expect(Math.round(colorToDisplayValue(next, "hsl", "h"))).toBe(120);
    expect(Math.round(colorToDisplayValue(next, "hsl", "s"))).toBe(50);
  });
  it("ignores channels with no matching value", () => {
    const next = applyDisplayValues(BLUE, "hsl", ["h", "s"], [120]);
    expect(Math.round(colorToDisplayValue(next, "hsl", "h"))).toBe(120);
    expect(Math.round(colorToDisplayValue(next, "hsl", "s"))).toBe(80);
  });
});

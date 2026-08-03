import { describe, it, expect } from "bun:test";
import { valueFromPosition, positionFromValue, valueFromKey, sliderAria, type SliderState } from "../src/slider";

function state(overrides: Partial<SliderState> = {}): SliderState {
  return {
    value: 50,
    min: 0,
    max: 100,
    step: 1,
    orientation: "horizontal",
    dir: "ltr",
    inverted: false,
    disabled: false,
    ...overrides,
  };
}

describe("valueFromPosition", () => {
  it("maps a position across the range", () => {
    expect(valueFromPosition(state(), 0)).toBe(0);
    expect(valueFromPosition(state(), 0.5)).toBe(50);
    expect(valueFromPosition(state(), 1)).toBe(100);
  });
  it("clamps positions outside 0-1", () => {
    expect(valueFromPosition(state(), -1)).toBe(0);
    expect(valueFromPosition(state(), 2)).toBe(100);
  });
  it("snaps to the step", () => {
    expect(valueFromPosition(state({ step: 25 }), 0.4)).toBe(50);
  });
  it("inverts for a vertical slider so 0 is the bottom", () => {
    expect(valueFromPosition(state({ orientation: "vertical" }), 0)).toBe(100);
    expect(valueFromPosition(state({ orientation: "vertical" }), 1)).toBe(0);
  });
  it("flips a horizontal slider in rtl", () => {
    expect(valueFromPosition(state({ dir: "rtl" }), 0)).toBe(100);
  });
  it("does not let rtl affect a vertical slider", () => {
    expect(valueFromPosition(state({ orientation: "vertical", dir: "rtl" }), 0)).toBe(100);
  });
  it("flips when inverted", () => {
    expect(valueFromPosition(state({ inverted: true }), 0)).toBe(100);
  });
  it("cancels out when rtl and inverted are both set", () => {
    expect(valueFromPosition(state({ dir: "rtl", inverted: true }), 0)).toBe(0);
  });
});

describe("positionFromValue", () => {
  it("round-trips with valueFromPosition", () => {
    for (const s of [state(), state({ dir: "rtl" }), state({ inverted: true }), state({ orientation: "vertical" })]) {
      const pos = positionFromValue({ ...s, value: 25 });
      expect(valueFromPosition(s, pos)).toBe(25);
    }
  });
  it("returns 0 for a degenerate range", () => {
    expect(positionFromValue(state({ min: 5, max: 5, value: 5 }))).toBe(0);
  });
});

describe("valueFromKey", () => {
  it("steps up and down with horizontal arrows", () => {
    expect(valueFromKey(state(), { key: "ArrowRight" })).toBe(51);
    expect(valueFromKey(state(), { key: "ArrowLeft" })).toBe(49);
  });
  it("responds to off-axis arrows", () => {
    expect(valueFromKey(state(), { key: "ArrowUp" })).toBe(51);
    expect(valueFromKey(state({ orientation: "vertical" }), { key: "ArrowRight" })).toBe(51);
  });
  it("multiplies by 10 with shift", () => {
    expect(valueFromKey(state(), { key: "ArrowRight", shiftKey: true })).toBe(60);
  });
  it("pages by ten steps and ignores shift", () => {
    expect(valueFromKey(state(), { key: "PageUp" })).toBe(60);
    expect(valueFromKey(state(), { key: "PageDown" })).toBe(40);
    expect(valueFromKey(state(), { key: "PageUp", shiftKey: true })).toBe(60);
  });
  it("jumps to the bounds with Home and End regardless of inverted", () => {
    expect(valueFromKey(state(), { key: "Home" })).toBe(0);
    expect(valueFromKey(state(), { key: "End" })).toBe(100);
    expect(valueFromKey(state({ inverted: true }), { key: "Home" })).toBe(0);
  });
  it("reverses horizontal arrows in rtl", () => {
    expect(valueFromKey(state({ dir: "rtl" }), { key: "ArrowRight" })).toBe(49);
  });
  it("clamps at the bounds", () => {
    expect(valueFromKey(state({ value: 100 }), { key: "ArrowRight" })).toBe(100);
    expect(valueFromKey(state({ value: 0 }), { key: "ArrowLeft" })).toBe(0);
  });
  it("returns undefined for unhandled keys", () => {
    expect(valueFromKey(state(), { key: "Enter" })).toBeUndefined();
  });
  it("returns undefined for every key when disabled", () => {
    for (const key of ["ArrowRight", "PageUp", "Home", "End"]) {
      expect(valueFromKey(state({ disabled: true }), { key })).toBeUndefined();
    }
  });
});

describe("sliderAria", () => {
  it("describes an enabled slider", () => {
    expect(sliderAria(state())).toEqual({
      "role": "slider",
      "aria-valuenow": 50,
      "aria-valuemin": 0,
      "aria-valuemax": 100,
      "aria-orientation": "horizontal",
      "aria-disabled": undefined,
      "tabindex": 0,
    });
  });
  it("removes the tab stop when disabled", () => {
    const aria = sliderAria(state({ disabled: true }));
    expect(aria["aria-disabled"]).toBe(true);
    expect(aria.tabindex).toBeUndefined();
  });
});

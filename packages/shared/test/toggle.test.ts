import { describe, it, expect } from "bun:test";
import { toggleAria, isToggleActivationKey, rovingIndexFromKey, rovingTabIndex, type ToggleGroupState } from "../src/toggle";

function group(overrides: Partial<ToggleGroupState> = {}): ToggleGroupState {
  return { activeIndex: 0, count: 3, orientation: "horizontal", dir: "ltr", loop: true, ...overrides };
}

describe("toggleAria", () => {
  it("describes a pressed, enabled toggle", () => {
    expect(toggleAria(true, false)).toEqual({
      "aria-pressed": true,
      "aria-disabled": undefined,
      "data-pressed": "",
      "data-disabled": undefined,
      "tabindex": 0,
    });
  });
  it("describes an unpressed, disabled toggle", () => {
    expect(toggleAria(false, true)).toEqual({
      "aria-pressed": false,
      "aria-disabled": true,
      "data-pressed": undefined,
      "data-disabled": "",
      "tabindex": undefined,
    });
  });
});

describe("isToggleActivationKey", () => {
  it("accepts Enter and Space only", () => {
    expect(isToggleActivationKey("Enter")).toBe(true);
    expect(isToggleActivationKey(" ")).toBe(true);
    expect(isToggleActivationKey("a")).toBe(false);
    expect(isToggleActivationKey("ArrowRight")).toBe(false);
  });
});

describe("rovingIndexFromKey", () => {
  it("moves forward and back along the orientation", () => {
    expect(rovingIndexFromKey(group({ activeIndex: 0 }), "ArrowRight")).toBe(1);
    expect(rovingIndexFromKey(group({ activeIndex: 1 }), "ArrowLeft")).toBe(0);
  });
  it("ignores the off-axis arrows", () => {
    expect(rovingIndexFromKey(group(), "ArrowDown")).toBeUndefined();
    expect(rovingIndexFromKey(group({ orientation: "vertical" }), "ArrowRight")).toBeUndefined();
  });
  it("reverses horizontal arrows in rtl", () => {
    expect(rovingIndexFromKey(group({ activeIndex: 1, dir: "rtl" }), "ArrowRight")).toBe(0);
  });
  it("wraps when looping", () => {
    expect(rovingIndexFromKey(group({ activeIndex: 2 }), "ArrowRight")).toBe(0);
    expect(rovingIndexFromKey(group({ activeIndex: 0 }), "ArrowLeft")).toBe(2);
  });
  it("stops at the ends when not looping", () => {
    expect(rovingIndexFromKey(group({ activeIndex: 2, loop: false }), "ArrowRight")).toBe(2);
    expect(rovingIndexFromKey(group({ activeIndex: 0, loop: false }), "ArrowLeft")).toBe(0);
  });
  it("jumps to the ends with Home and End", () => {
    expect(rovingIndexFromKey(group({ activeIndex: 1 }), "Home")).toBe(0);
    expect(rovingIndexFromKey(group({ activeIndex: 1 }), "End")).toBe(2);
  });
  it("returns undefined for an empty group", () => {
    expect(rovingIndexFromKey(group({ count: 0 }), "ArrowRight")).toBeUndefined();
  });
});

describe("rovingTabIndex", () => {
  it("gives the tab stop to the active item only", () => {
    expect(rovingTabIndex(group({ activeIndex: 1 }), 1)).toBe(0);
    expect(rovingTabIndex(group({ activeIndex: 1 }), 0)).toBe(-1);
  });
});

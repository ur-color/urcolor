import { describe, expect, it } from "bun:test";
import {
  PANELS,
  hueRamp,
  layoutModeForWidth,
  panelsForMode,
} from "../.vitepress/composables/heroLayout";

describe("layoutModeForWidth", () => {
  it("picks stack below 420", () => {
    expect(layoutModeForWidth(343)).toBe("stack");
    expect(layoutModeForWidth(419)).toBe("stack");
  });

  it("picks compact from 420 up to 620", () => {
    expect(layoutModeForWidth(420)).toBe("compact");
    expect(layoutModeForWidth(619)).toBe("compact");
  });

  it("picks grid at 620 and above", () => {
    expect(layoutModeForWidth(620)).toBe("grid");
    expect(layoutModeForWidth(900)).toBe("grid");
  });

  it("puts a 1440px viewport's right column in grid and a 1080px one in compact", () => {
    // The two-column stage gets roughly half the page width.
    expect(layoutModeForWidth(630)).toBe("grid");
    expect(layoutModeForWidth(470)).toBe("compact");
  });
});

describe("panelsForMode", () => {
  it("keeps all six panels in grid mode", () => {
    expect(panelsForMode("grid")).toEqual([
      "hex",
      "name",
      "formats",
      "swatches",
      "sliders",
      "fields",
    ]);
  });

  it("drops the formats panel in compact mode, where the hex panel folds it in", () => {
    expect(panelsForMode("compact")).not.toContain("formats");
    expect(panelsForMode("compact")).toHaveLength(5);
  });

  it("keeps all six panels in stack mode, where they flow vertically", () => {
    expect(panelsForMode("stack")).toHaveLength(6);
  });

  it("hands back a copy, so a caller cannot edit the shared list", () => {
    panelsForMode("grid").push("hex");
    expect(PANELS).toHaveLength(6);
  });
});

describe("hueRamp", () => {
  it("returns eight steps from dark to light at the given hue", () => {
    const ramp = hueRamp(210);
    expect(ramp).toHaveLength(8);
    expect(ramp[0]).toBe("hsl(210, 85%, 12%)");
    expect(ramp[7]).toBe("hsl(210, 85%, 92%)");
  });

  it("wraps hues at 360", () => {
    expect(hueRamp(370)[0]).toBe("hsl(10, 85%, 12%)");
  });
});

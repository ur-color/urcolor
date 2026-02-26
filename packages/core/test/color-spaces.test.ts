import { describe, expect, it } from "bun:test";
import {
  colorSpaces,
  getChannelConfig,
  displayToCulori,
  culoriToDisplay,
  type ChannelConfig,
} from "../src/color-spaces";

describe("colorSpaces", () => {
  it("contains expected color spaces", () => {
    const keys = Object.keys(colorSpaces);
    expect(keys).toContain("hsl");
    expect(keys).toContain("rgb");
    expect(keys).toContain("oklch");
    expect(keys).toContain("oklab");
    expect(keys).toContain("p3");
  });

  it("each space has mode, label, and 3 channels", () => {
    for (const [key, space] of Object.entries(colorSpaces)) {
      expect(space.mode).toBe(key);
      expect(space.label).toBeTruthy();
      expect(space.channels).toHaveLength(3);
    }
  });

  it("each channel has required fields", () => {
    for (const space of Object.values(colorSpaces)) {
      for (const ch of space.channels) {
        expect(ch.key).toBeTruthy();
        expect(ch.label).toBeTruthy();
        expect(typeof ch.min).toBe("number");
        expect(typeof ch.max).toBe("number");
        expect(typeof ch.step).toBe("number");
        expect(["number", "degree", "percentage"]).toContain(ch.format);
      }
    }
  });
});

describe("getChannelConfig", () => {
  it("returns config for valid space/channel", () => {
    const config = getChannelConfig("hsl", "h");
    expect(config).toBeDefined();
    expect(config!.key).toBe("h");
    expect(config!.max).toBe(360);
  });

  it("returns undefined for invalid space", () => {
    expect(getChannelConfig("xyz", "h")).toBeUndefined();
  });

  it("returns undefined for invalid channel", () => {
    expect(getChannelConfig("hsl", "z")).toBeUndefined();
  });
});

describe("displayToCulori", () => {
  it("returns value as-is when no culori range differs", () => {
    const config: ChannelConfig = { key: "h", label: "Hue", min: 0, max: 360, step: 1, format: "degree" };
    expect(displayToCulori(config, 180)).toBe(180);
  });

  it("maps display range to culori range", () => {
    // HSL saturation: display 0-100, culori 0-1
    const config = getChannelConfig("hsl", "s")!;
    expect(displayToCulori(config, 0)).toBe(0);
    expect(displayToCulori(config, 100)).toBe(1);
    expect(displayToCulori(config, 50)).toBe(0.5);
  });

  it("maps RGB: display 0-255 to culori 0-1", () => {
    const config = getChannelConfig("rgb", "r")!;
    expect(displayToCulori(config, 0)).toBe(0);
    expect(displayToCulori(config, 255)).toBe(1);
    expect(displayToCulori(config, 127.5)).toBe(0.5);
  });
});

describe("culoriToDisplay", () => {
  it("returns value as-is when no culori range differs", () => {
    const config: ChannelConfig = { key: "h", label: "Hue", min: 0, max: 360, step: 1, format: "degree" };
    expect(culoriToDisplay(config, 180)).toBe(180);
  });

  it("maps culori range to display range", () => {
    const config = getChannelConfig("hsl", "s")!;
    expect(culoriToDisplay(config, 0)).toBe(0);
    expect(culoriToDisplay(config, 1)).toBe(100);
    expect(culoriToDisplay(config, 0.5)).toBe(50);
  });

  it("rounds to step precision", () => {
    // oklch chroma has step=0.01
    const config = getChannelConfig("oklch", "c")!;
    const result = culoriToDisplay(config, 0.123456);
    expect(result).toBe(0.12);
  });

  it("round-trips with displayToCulori", () => {
    const config = getChannelConfig("rgb", "r")!;
    const display = 128;
    const culori = displayToCulori(config, display);
    const back = culoriToDisplay(config, culori);
    expect(back).toBe(128);
  });
});

import { describe, expect, it } from "bun:test";
import {
  channelsOf,
  colorSpaces,
  getChannelConfig,
  displayToNative,
  nativeToDisplay,
  type ChannelConfig,
} from "../src/color-spaces";

describe("colorSpaces", () => {
  it("contains expected color spaces", () => {
    const keys = Object.keys(colorSpaces);
    expect(keys).toContain("hsl");
    expect(keys).toContain("hsv");
    expect(keys).toContain("srgb");
    expect(keys).toContain("oklch");
    expect(keys).toContain("oklab");
    expect(keys).toContain("display-p3");
  });

  it("uses no culori-era space ids", () => {
    const keys = Object.keys(colorSpaces);
    for (const stale of ["rgb", "p3", "a98", "prophoto"]) {
      expect(keys).not.toContain(stale);
    }
  });

  it("each space has space, label, and 3 channels", () => {
    for (const [key, space] of Object.entries(colorSpaces)) {
      expect(key).toBe(space.space);
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
    expect(getChannelConfig("xyz-d65", "h")).toBeUndefined();
  });

  it("returns undefined for invalid channel", () => {
    expect(getChannelConfig("hsl", "z")).toBeUndefined();
  });
});

describe("displayToNative", () => {
  it("returns value as-is when no native range differs", () => {
    const config: ChannelConfig = { key: "h", label: "Hue", min: 0, max: 360, step: 1, format: "degree" };
    expect(displayToNative(config, 180)).toBe(180);
  });

  it("maps display range to native range", () => {
    // HSL saturation: display 0-100, native 0-1
    const config = getChannelConfig("hsl", "s")!;
    expect(displayToNative(config, 0)).toBe(0);
    expect(displayToNative(config, 100)).toBe(1);
    expect(displayToNative(config, 50)).toBe(0.5);
  });

  it("maps RGB: display 0-255 to native 0-1", () => {
    const config = getChannelConfig("srgb", "r")!;
    expect(displayToNative(config, 0)).toBe(0);
    expect(displayToNative(config, 255)).toBe(1);
    expect(displayToNative(config, 127.5)).toBe(0.5);
  });
});

describe("nativeToDisplay", () => {
  it("returns value as-is when no native range differs", () => {
    const config: ChannelConfig = { key: "h", label: "Hue", min: 0, max: 360, step: 1, format: "degree" };
    expect(nativeToDisplay(config, 180)).toBe(180);
  });

  it("maps native range to display range", () => {
    const config = getChannelConfig("hsl", "s")!;
    expect(nativeToDisplay(config, 0)).toBe(0);
    expect(nativeToDisplay(config, 1)).toBe(100);
    expect(nativeToDisplay(config, 0.5)).toBe(50);
  });

  it("rounds to step precision", () => {
    // oklch chroma has step=0.01
    const config = getChannelConfig("oklch", "c")!;
    const result = nativeToDisplay(config, 0.123456);
    expect(result).toBe(0.12);
  });

  it("round-trips with displayToNative", () => {
    const config = getChannelConfig("srgb", "r")!;
    const display = 128;
    const native = displayToNative(config, display);
    const back = nativeToDisplay(config, native);
    expect(back).toBe(128);
  });
});

describe("channelsOf", () => {
  it("returns a space's channels", () => {
    expect(channelsOf("hsl").map(c => c.key)).toEqual(["h", "s", "l"]);
    expect(channelsOf("oklch").map(c => c.key)).toEqual(["l", "c", "h"]);
  });

  it("returns the same array every call, so it is safe as a dependency", () => {
    expect(channelsOf("hsl")).toBe(channelsOf("hsl"));
    expect(channelsOf("hsl")).toBe(colorSpaces.hsl!.channels);
  });

  it("returns an empty list for a space with no channel configuration", () => {
    expect(channelsOf("xyz-d50")).toEqual([]);
    expect(channelsOf("xyz-d50")).toBe(channelsOf("srgb-linear"));
  });
});

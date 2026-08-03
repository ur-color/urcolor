import { describe, it, expect } from "bun:test";
import { channelLabel, formatChannelValue } from "../src/labels";

describe("channelLabel", () => {
  it("names alpha without consulting the space", () => {
    expect(channelLabel("hsl", "alpha")).toBe("Alpha");
  });
  it("uses the channel config label", () => {
    expect(channelLabel("hsl", "h")).toBe("Hue");
  });
  it("falls back to the raw key for an unknown channel", () => {
    expect(channelLabel("hsl", "zzz")).toBe("zzz");
  });
});

describe("formatChannelValue", () => {
  it("renders alpha as a whole percentage", () => {
    expect(formatChannelValue("hsl", "alpha", 50.4)).toBe("50%");
  });
  it("suffixes degree channels", () => {
    expect(formatChannelValue("hsl", "h", 210)).toBe("210°");
  });
  it("suffixes percentage channels", () => {
    expect(formatChannelValue("hsl", "s", 80)).toBe("80%");
  });
  it("strips a negative sign from a value that rounds to zero", () => {
    expect(formatChannelValue("hsl", "h", -0.3)).toBe("0°");
  });
  it("falls back to a rounded number for an unknown channel", () => {
    expect(formatChannelValue("hsl", "zzz", 1.7)).toBe("2");
  });
});

import { describe, expect, it } from "bun:test";
import { channelLabel, formatChannelValue } from "../src/shared/channel-labels";

describe("channel-labels", () => {
  it("returns the human label for a channel key", () => {
    expect(channelLabel("hsl", "h")).toBe("Hue");
    expect(channelLabel("hsl", "s")).toBe("Saturation");
  });

  it("labels alpha without consulting the space", () => {
    expect(channelLabel("hsl", "alpha")).toBe("Alpha");
  });

  it("falls back to the raw key for an unknown channel", () => {
    expect(channelLabel("hsl", "zzz")).toBe("zzz");
  });

  it("formats degree channels with a degree sign", () => {
    expect(formatChannelValue("hsl", "h", 210.4)).toBe("210°");
  });

  it("formats percentage channels with a percent sign", () => {
    expect(formatChannelValue("hsl", "s", 63.7)).toBe("64%");
  });

  it("formats \"number\" channels without a unit suffix", () => {
    // display-p3's r/g/b channels are format: "number" — no % or ° should be appended.
    const result = formatChannelValue("display-p3", "r", 0.5);
    expect(result).toBe("0.50");
    expect(result).not.toContain("%");
    expect(result).not.toContain("°");
  });

  it("rounds step: 0.01 channels to two decimals", () => {
    // oklch's c channel has step: 0.01, format: "number".
    expect(formatChannelValue("oklch", "c", 0.1345)).toBe("0.13");
  });

  it("formats negative values on channels whose range spans zero", () => {
    // lab's a channel: min -125, max 125, step 1 (0 decimals).
    expect(formatChannelValue("lab", "a", -42.7)).toBe("-43");
    // oklab's a channel: min -0.4, max 0.4, step 0.01 (2 decimals).
    expect(formatChannelValue("oklab", "a", -0.15)).toBe("-0.15");
  });

  it("never renders a negative-zero artifact", () => {
    // lab's a channel (step 1, 0 decimals): (-0.3).toFixed(0) is natively "-0".
    expect(formatChannelValue("lab", "a", -0.3)).toBe("0");
    // oklab's a channel (step 0.01, 2 decimals): (-0.004).toFixed(2) is natively "-0.00".
    expect(formatChannelValue("oklab", "a", -0.004)).toBe("0.00");
  });
});

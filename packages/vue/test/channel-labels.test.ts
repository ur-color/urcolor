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
});

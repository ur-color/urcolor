import { describe, expect, it } from "bun:test";
import { formatNotation, parseNotation } from "../src/notation";

describe("parseNotation", () => {
  const expected = { blackness: 10, chromaticness: 50, hue: { from: "Y", to: "R", percent: 90 } };

  it("accepts every prefix form", () => {
    for (const input of ["S 1050-Y90R", "1050-Y90R", "NCS S 1050-Y90R", "NCS 1050-Y90R"]) {
      expect(parseNotation(input)).toEqual(expected);
    }
  });

  it("accepts the functional wrapper around any prefix form", () => {
    expect(parseNotation("ncs(1050-Y90R)")).toEqual(expected);
    expect(parseNotation("ncs(S 1050-Y90R)")).toEqual(expected);
    expect(parseNotation("NCS(s 1050-y90r)")).toEqual(expected);
  });

  it("is case-insensitive and tolerates surrounding space", () => {
    expect(parseNotation("  s 1050-y90r  ")).toEqual(expected);
  });

  it("reads an elementary hue with no second hue", () => {
    expect(parseNotation("S 0580-Y")).toEqual({
      blackness: 5, chromaticness: 80, hue: { from: "Y", to: null, percent: 0 },
    });
  });

  it("reads the neutral axis", () => {
    expect(parseNotation("S 0500-N")).toEqual({ blackness: 5, chromaticness: 0, hue: null });
    expect(parseNotation("9000-N")).toEqual({ blackness: 90, chromaticness: 0, hue: null });
  });

  it("rejects blackness plus chromaticness over 100", () => {
    // Whiteness is the remainder, so such a pair describes nothing at all.
    expect(parseNotation("S 6050-Y")).toBeNull();
    expect(parseNotation("S 9020-Y90R")).toBeNull();
  });

  it("accepts a pair summing to exactly 100", () => {
    expect(parseNotation("S 5050-Y")).not.toBeNull();
  });

  it("rejects non-adjacent hue pairs", () => {
    // NCS holds that no hue resembles both members of an opponent pair, so
    // there is no redgreen and no yellowblue.
    expect(parseNotation("S 1050-R90G")).toBeNull();
    expect(parseNotation("S 1050-Y50B")).toBeNull();
    expect(parseNotation("S 1050-B50Y")).toBeNull();
  });

  it("rejects a hue pair naming the same hue twice", () => {
    expect(parseNotation("S 1050-Y50Y")).toBeNull();
  });

  it("rejects chromaticness on the neutral axis", () => {
    expect(parseNotation("S 1050-N")).toBeNull();
  });

  it("returns null for anything that is not NCS", () => {
    for (const input of ["", "red", "#ff0000", "oklch(0.5 0.1 20)", "S 105-Y90R", "S 1050", "1050-Z"]) {
      expect(parseNotation(input)).toBeNull();
    }
  });
});

describe("formatNotation", () => {
  it("emits the canonical S-prefixed form", () => {
    expect(formatNotation({ blackness: 10, chromaticness: 50, hue: { from: "Y", to: "R", percent: 90 } }))
      .toBe("S 1050-Y90R");
  });

  it("pads every field to two digits", () => {
    expect(formatNotation({ blackness: 5, chromaticness: 0, hue: null })).toBe("S 0500-N");
    expect(formatNotation({ blackness: 5, chromaticness: 8, hue: { from: "Y", to: "R", percent: 5 } }))
      .toBe("S 0508-Y05R");
  });

  it("omits the second hue for an elementary hue", () => {
    expect(formatNotation({ blackness: 5, chromaticness: 80, hue: { from: "Y", to: null, percent: 0 } }))
      .toBe("S 0580-Y");
  });

  it("round-trips through parseNotation", () => {
    for (const input of ["S 1050-Y90R", "S 0580-Y", "S 0500-N", "S 8005-B50G"]) {
      expect(formatNotation(parseNotation(input)!)).toBe(input);
    }
  });
});

import { afterEach, describe, expect, it } from "bun:test";
import { Color, deltaE, tryParse } from "@urcolor/core";
import { registerNcsColor, toNcs } from "../src/index";

let dispose: (() => void) | null = null;

afterEach(() => {
  dispose?.();
  dispose = null;
});

describe("registration", () => {
  it("does not parse NCS until registered", () => {
    // Registration is not a side effect of importing the package, matching
    // `registerRelativeColor()`.
    expect(Color.parse("S 1050-Y90R")).toBeNull();
  });

  it("parses NCS once registered", () => {
    dispose = registerNcsColor();
    const color = Color.parse("S 1050-Y90R");
    expect(color).not.toBeNull();
    expect(deltaE(color!.toObject(), tryParse("#eb7f7a")!, "2000")).toBeLessThan(5);
  });

  it("stops parsing after dispose, and disposing twice is a no-op", () => {
    const off = registerNcsColor();
    expect(Color.parse("S 1050-Y90R")).not.toBeNull();
    off();
    expect(Color.parse("S 1050-Y90R")).toBeNull();
    expect(() => off()).not.toThrow();
    expect(Color.parse("S 1050-Y90R")).toBeNull();
  });

  it("never shadows a built-in notation", () => {
    dispose = registerNcsColor();
    // Registered parsers run after every built-in, so these must still be
    // answered by core itself and be unchanged by this package's presence.
    for (const input of ["#ff0000", "red", "oklch(0.5 0.1 20)", "rgb(1 2 3)", "hsl(10 20% 30%)"]) {
      expect(Color.parse(input)).not.toBeNull();
    }
    expect(Color.parse("#ff0000")!.toObject().coords).toEqual([1, 0, 0]);
  });

  it("leaves unrecognised strings alone", () => {
    dispose = registerNcsColor();
    for (const input of ["", "not a colour", "S 6050-Y", "S 1050-R90G"]) {
      expect(Color.parse(input)).toBeNull();
    }
  });
});

describe("accepted forms through Color.parse", () => {
  it("accepts every prefix form and the functional wrapper", () => {
    dispose = registerNcsColor();
    const canonical = Color.parse("S 1050-Y90R")!.toObject();
    for (const input of ["1050-Y90R", "NCS S 1050-Y90R", "NCS 1050-Y90R", "ncs(1050-Y90R)", "s 1050-y90r"]) {
      const color = Color.parse(input);
      expect(color).not.toBeNull();
      expect(color!.toObject().coords).toEqual(canonical.coords);
    }
  });
});

describe("toNcs", () => {
  it("names a colour in NCS notation", () => {
    expect(toNcs(Color.parse("#eb7f7a")!)).toMatch(/^S \d{4}-[YRBG](\d{2}[YRBG])?$/);
  });

  it("uses the neutral axis for greys", () => {
    expect(toNcs(Color.parse("#808080")!)).toMatch(/^S \d{4}-N$/);
    expect(toNcs(Color.parse("#ffffff")!)).toBe("S 0000-N");
  });

  it("always emits something Color.parse can read back", () => {
    dispose = registerNcsColor();
    for (const hex of ["#eb7f7a", "#3a8383", "#ffd200", "#000000", "#ffffff", "#ff00ff", "#123456"]) {
      const notation = toNcs(Color.parse(hex)!);
      expect(Color.parse(notation)).not.toBeNull();
    }
  });
});

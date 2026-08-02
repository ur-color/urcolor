import { describe, expect, it } from "bun:test";
import {
  DOCKS,
  connectorPath,
  docksForMode,
  edgePoint,
  hueRamp,
  orbitModeForWidth,
} from "../.vitepress/composables/heroOrbit";

describe("orbitModeForWidth", () => {
  it("picks stack below 420", () => {
    expect(orbitModeForWidth(343)).toBe("stack");
    expect(orbitModeForWidth(419)).toBe("stack");
  });

  it("picks compact from 420 up to 620", () => {
    expect(orbitModeForWidth(420)).toBe("compact");
    expect(orbitModeForWidth(619)).toBe("compact");
  });

  it("picks orbit at 620 and above", () => {
    expect(orbitModeForWidth(620)).toBe("orbit");
    expect(orbitModeForWidth(900)).toBe("orbit");
  });

  it("puts a 1440px viewport's right column in orbit and a 1080px one in compact", () => {
    // The two-column stage gets roughly half the page width.
    expect(orbitModeForWidth(630)).toBe("orbit");
    expect(orbitModeForWidth(470)).toBe("compact");
  });
});

describe("docksForMode", () => {
  it("keeps all five docks in orbit mode", () => {
    expect(docksForMode("orbit").map(d => d.id)).toEqual(
      ["hex", "formats", "swatches", "sliders", "fields"],
    );
  });

  it("drops the formats dock in compact mode", () => {
    expect(docksForMode("compact").map(d => d.id)).not.toContain("formats");
    expect(docksForMode("compact")).toHaveLength(4);
  });

  it("keeps all five docks in stack mode, where they flow vertically", () => {
    expect(docksForMode("stack")).toHaveLength(5);
  });

  it("gives every dock a depth between 1 and 3", () => {
    for (const dock of DOCKS) {
      expect(dock.depth).toBeGreaterThanOrEqual(1);
      expect(dock.depth).toBeLessThanOrEqual(3);
    }
  });
});

describe("edgePoint", () => {
  it("walks right at 0 degrees", () => {
    const p = edgePoint({ x: 100, y: 100 }, 50, 0);
    expect(p.x).toBeCloseTo(150, 5);
    expect(p.y).toBeCloseTo(100, 5);
  });

  it("walks up at 90 degrees, in screen coordinates", () => {
    const p = edgePoint({ x: 100, y: 100 }, 50, 90);
    expect(p.x).toBeCloseTo(100, 5);
    expect(p.y).toBeCloseTo(50, 5);
  });
});

describe("connectorPath", () => {
  it("emits a quadratic path between the two points", () => {
    const d = connectorPath({ x: 0, y: 0 }, { x: 100, y: 0 });
    expect(d).toMatch(/^M 0 0 Q /);
    expect(d).toMatch(/100 0$/);
  });

  it("bows perpendicular to the segment", () => {
    const d = connectorPath({ x: 0, y: 0 }, { x: 100, y: 0 }, 0.1);
    const control = d.match(/Q ([\d.-]+) ([\d.-]+)/)!;
    expect(Number(control[1])).toBeCloseTo(50, 5);
    expect(Number(control[2])).toBeCloseTo(10, 5);
  });

  it("degrades to a straight line for coincident points", () => {
    expect(connectorPath({ x: 7, y: 7 }, { x: 7, y: 7 })).toBe("M 7 7 L 7 7");
  });
});

describe("hueRamp", () => {
  it("returns eight css colors at the given hue", () => {
    const ramp = hueRamp(328);
    expect(ramp).toHaveLength(8);
    for (const c of ramp) expect(c).toMatch(/^hsl\(328, 85%, \d+%\)$/);
  });

  it("ascends in lightness", () => {
    const ls = hueRamp(0).map(c => Number(c.match(/(\d+)%\)$/)![1]));
    for (let i = 1; i < ls.length; i++) expect(ls[i]!).toBeGreaterThan(ls[i - 1]!);
  });

  it("rounds the hue so the css string stays short", () => {
    expect(hueRamp(327.6)[0]).toMatch(/^hsl\(328,/);
  });
});

import { describe, expect, it } from "bun:test";
import {
  polarToCartesian,
  cartesianToPolar,
  clampToCircle,
  normalizeAngle,
  triangleVertices,
  barycentricCoords,
  barycentricToCartesian,
  pointInTriangle,
  clampToTriangle,
  insetTriangle,
} from "../src/geometry";

const EPSILON = 1e-9;

function near(a: number, b: number, eps = EPSILON) {
  expect(Math.abs(a - b)).toBeLessThan(eps);
}

describe("polarToCartesian", () => {
  it("0° (top) should point upward", () => {
    const p = polarToCartesian(0, 100, 0, 0);
    near(p.x, 0);
    near(p.y, -100);
  });

  it("90° (right) should point right", () => {
    const p = polarToCartesian(90, 100, 0, 0);
    near(p.x, 100);
    near(p.y, 0);
  });

  it("180° (bottom) should point down", () => {
    const p = polarToCartesian(180, 100, 0, 0);
    near(p.x, 0, 1e-7);
    near(p.y, 100);
  });

  it("respects center offset", () => {
    const p = polarToCartesian(0, 50, 10, 20);
    near(p.x, 10);
    near(p.y, -30);
  });
});

describe("cartesianToPolar", () => {
  it("point directly above center is 0°", () => {
    const { angle, radius } = cartesianToPolar(0, -100, 0, 0);
    near(angle, 0);
    near(radius, 100);
  });

  it("point to the right of center is 90°", () => {
    const { angle, radius } = cartesianToPolar(100, 0, 0, 0);
    near(angle, 90);
    near(radius, 100);
  });

  it("round-trips with polarToCartesian", () => {
    for (const a of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const p = polarToCartesian(a, 50, 10, 20);
      const { angle, radius } = cartesianToPolar(p.x, p.y, 10, 20);
      near(angle, a, 1e-7);
      near(radius, 50, 1e-7);
    }
  });
});

describe("clampToCircle", () => {
  it("returns same point if inside", () => {
    const p = clampToCircle(5, 5, 0, 0, 100);
    expect(p.x).toBe(5);
    expect(p.y).toBe(5);
  });

  it("clamps point outside to circle edge", () => {
    const p = clampToCircle(200, 0, 0, 0, 100);
    near(p.x, 100);
    near(p.y, 0);
  });

  it("clamps diagonal point", () => {
    const p = clampToCircle(100, 100, 0, 0, 10);
    const dist = Math.sqrt(p.x * p.x + p.y * p.y);
    near(dist, 10);
  });
});

describe("normalizeAngle", () => {
  it("returns angle as-is if in range", () => {
    expect(normalizeAngle(180)).toBe(180);
  });

  it("wraps negative angles", () => {
    expect(normalizeAngle(-90)).toBe(270);
  });

  it("wraps angles >= 360", () => {
    expect(normalizeAngle(450)).toBe(90);
  });

  it("applies start angle offset", () => {
    expect(normalizeAngle(90, 90)).toBe(0);
    expect(normalizeAngle(45, 90)).toBe(315);
  });
});

describe("triangleVertices", () => {
  it("returns 3 points", () => {
    const verts = triangleVertices(100, 100);
    expect(verts).toHaveLength(3);
  });

  it("vertices lie on circumscribed circle", () => {
    const w = 100, h = 100;
    const verts = triangleVertices(w, h);
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2;
    for (const v of verts) {
      const dist = Math.sqrt((v.x - cx) ** 2 + (v.y - cy) ** 2);
      near(dist, r, 1e-7);
    }
  });
});

describe("barycentricCoords / barycentricToCartesian", () => {
  const v0 = { x: 0, y: 0 };
  const v1 = { x: 10, y: 0 };
  const v2 = { x: 0, y: 10 };

  it("vertex v0 has coords (1,0,0)", () => {
    const { u, v, w } = barycentricCoords(0, 0, v0, v1, v2);
    near(u, 1);
    near(v, 0);
    near(w, 0);
  });

  it("centroid has equal coords", () => {
    const cx = (v0.x + v1.x + v2.x) / 3;
    const cy = (v0.y + v1.y + v2.y) / 3;
    const { u, v, w } = barycentricCoords(cx, cy, v0, v1, v2);
    near(u, 1 / 3);
    near(v, 1 / 3);
    near(w, 1 / 3);
  });

  it("round-trips back to cartesian", () => {
    const px = 3, py = 2;
    const { u, v, w } = barycentricCoords(px, py, v0, v1, v2);
    const p = barycentricToCartesian(u, v, w, v0, v1, v2);
    near(p.x, px);
    near(p.y, py);
  });
});

describe("pointInTriangle", () => {
  const v0 = { x: 0, y: 0 };
  const v1 = { x: 10, y: 0 };
  const v2 = { x: 0, y: 10 };

  it("centroid is inside", () => {
    expect(pointInTriangle(3, 3, v0, v1, v2)).toBe(true);
  });

  it("point outside is outside", () => {
    expect(pointInTriangle(10, 10, v0, v1, v2)).toBe(false);
  });

  it("vertex is on boundary (inside)", () => {
    expect(pointInTriangle(0, 0, v0, v1, v2)).toBe(true);
  });
});

describe("clampToTriangle", () => {
  const v0 = { x: 0, y: 0 };
  const v1 = { x: 10, y: 0 };
  const v2 = { x: 0, y: 10 };

  it("returns same point if inside", () => {
    const p = clampToTriangle(3, 3, v0, v1, v2);
    expect(p.x).toBe(3);
    expect(p.y).toBe(3);
  });

  it("clamps outside point to nearest edge", () => {
    const p = clampToTriangle(20, 0, v0, v1, v2);
    near(p.x, 10);
    near(p.y, 0);
  });

  it("clamps far-away point to nearest edge", () => {
    const p = clampToTriangle(-10, -10, v0, v1, v2);
    // Should clamp to v0 (nearest vertex)
    near(p.x, 0);
    near(p.y, 0);
  });
});

describe("insetTriangle", () => {
  const v0 = { x: 50, y: 0 };
  const v1 = { x: 100, y: 100 };
  const v2 = { x: 0, y: 100 };

  it("returns 3 vertices", () => {
    const result = insetTriangle(v0, v1, v2, 5);
    expect(result).toHaveLength(3);
  });

  it("inset triangle is smaller", () => {
    const result = insetTriangle(v0, v1, v2, 5);
    const cx = (v0.x + v1.x + v2.x) / 3;
    const cy = (v0.y + v1.y + v2.y) / 3;
    // Each vertex should be closer to centroid
    for (let i = 0; i < 3; i++) {
      const orig = [v0, v1, v2][i]!;
      const inset = result[i];
      const origDist = Math.sqrt((orig.x - cx) ** 2 + (orig.y - cy) ** 2);
      const insetDist = Math.sqrt((inset.x - cx) ** 2 + (inset.y - cy) ** 2);
      expect(insetDist).toBeLessThan(origDist);
    }
  });

  it("preserves centroid", () => {
    const result = insetTriangle(v0, v1, v2, 5);
    const origCx = (v0.x + v1.x + v2.x) / 3;
    const origCy = (v0.y + v1.y + v2.y) / 3;
    const newCx = (result[0].x + result[1].x + result[2].x) / 3;
    const newCy = (result[0].y + result[1].y + result[2].y) / 3;
    near(newCx, origCx, 1e-7);
    near(newCy, origCy, 1e-7);
  });

  it("clamps inset if larger than inradius", () => {
    // Very large inset should not produce degenerate triangle
    const result = insetTriangle(v0, v1, v2, 9999);
    expect(result).toHaveLength(3);
  });
});

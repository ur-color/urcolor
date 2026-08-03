export interface Point {
  x: number;
  y: number;
}

export interface PolarCoord {
  angle: number;
  radius: number;
}

// --- Polar coordinate utilities ---

/** Convert polar coordinates to cartesian, with angle in degrees (0 = top/12 o'clock, clockwise). */
export function polarToCartesian(angle: number, radius: number, cx: number, cy: number): Point {
  const rad = (angle - 90) * Math.PI / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

/** Convert cartesian to polar coordinates, returning angle in degrees (0 = top/12 o'clock, clockwise). */
export function cartesianToPolar(x: number, y: number, cx: number, cy: number): PolarCoord {
  const dx = x - cx;
  const dy = y - cy;
  const radius = Math.sqrt(dx * dx + dy * dy);
  // atan2 gives angle from positive X axis; we want 0 = top (negative Y), clockwise
  let angle = Math.atan2(dx, -dy) * 180 / Math.PI;
  if (angle < 0) angle += 360;
  return { angle, radius };
}

/** Clamp a point to be within a circle of radius r centered at (cx, cy). */
export function clampToCircle(x: number, y: number, cx: number, cy: number, r: number): Point {
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist <= r) return { x, y };
  return {
    x: cx + (dx / dist) * r,
    y: cy + (dy / dist) * r,
  };
}

/** Normalize an angle to 0-360, applying a start angle offset. */
export function normalizeAngle(angle: number, startAngle = 0): number {
  return ((angle - startAngle) % 360 + 360) % 360;
}

// --- Triangle / barycentric utilities ---

/** Get equilateral triangle vertices inscribed in a bounding box, with optional rotation. */
export function triangleVertices(width: number, height: number, rotation = 0): [Point, Point, Point] {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2;
  // Equilateral triangle: vertices at 0°, 120°, 240° from top
  const angles = [0, 120, 240].map(a => a + rotation);
  return angles.map(a => polarToCartesian(a, r, cx, cy)) as [Point, Point, Point];
}

/** Compute barycentric coordinates of point (x, y) relative to triangle (v0, v1, v2). */
export function barycentricCoords(x: number, y: number, v0: Point, v1: Point, v2: Point): { u: number; v: number; w: number } {
  const d = (v1.y - v2.y) * (v0.x - v2.x) + (v2.x - v1.x) * (v0.y - v2.y);
  const u = ((v1.y - v2.y) * (x - v2.x) + (v2.x - v1.x) * (y - v2.y)) / d;
  const v = ((v2.y - v0.y) * (x - v2.x) + (v0.x - v2.x) * (y - v2.y)) / d;
  const w = 1 - u - v;
  return { u, v, w };
}

/** Convert barycentric coordinates back to cartesian. */
export function barycentricToCartesian(u: number, v: number, w: number, v0: Point, v1: Point, v2: Point): Point {
  return {
    x: u * v0.x + v * v1.x + w * v2.x,
    y: u * v0.y + v * v1.y + w * v2.y,
  };
}

/** Check if a point is inside a triangle using barycentric coordinates. */
export function pointInTriangle(x: number, y: number, v0: Point, v1: Point, v2: Point): boolean {
  const { u, v, w } = barycentricCoords(x, y, v0, v1, v2);
  return u >= 0 && v >= 0 && w >= 0;
}

/** Closest point on line segment from a to b to point p. */
function closestPointOnSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): Point {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: ax, y: ay };
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return { x: ax + t * dx, y: ay + t * dy };
}

/** Inset a triangle toward its centroid by a given distance. Returns a smaller similar triangle. */
export function insetTriangle(v0: Point, v1: Point, v2: Point, inset: number): [Point, Point, Point] {
  const cx = (v0.x + v1.x + v2.x) / 3;
  const cy = (v0.y + v1.y + v2.y) / 3;

  // Compute inradius via area / semi-perimeter (works for any triangle)
  const a = Math.hypot(v1.x - v2.x, v1.y - v2.y);
  const b = Math.hypot(v0.x - v2.x, v0.y - v2.y);
  const c = Math.hypot(v0.x - v1.x, v0.y - v1.y);
  const s = (a + b + c) / 2;
  const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
  const inradius = area / s;

  if (inset >= inradius) inset = inradius * 0.9; // safety clamp
  const scale = (inradius - inset) / inradius;

  return [
    { x: cx + (v0.x - cx) * scale, y: cy + (v0.y - cy) * scale },
    { x: cx + (v1.x - cx) * scale, y: cy + (v1.y - cy) * scale },
    { x: cx + (v2.x - cx) * scale, y: cy + (v2.y - cy) * scale },
  ];
}

/** Clamp a point to be within a triangle. If outside, project to nearest edge. */
export function clampToTriangle(x: number, y: number, v0: Point, v1: Point, v2: Point): Point {
  if (pointInTriangle(x, y, v0, v1, v2)) return { x, y };

  const edges: [Point, Point][] = [[v0, v1], [v1, v2], [v2, v0]];
  let best: Point = v0;
  let bestDist = Infinity;

  for (const [a, b] of edges) {
    const p = closestPointOnSegment(x, y, a.x, a.y, b.x, b.y);
    const dx = p.x - x;
    const dy = p.y - y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = p;
    }
  }

  return best;
}

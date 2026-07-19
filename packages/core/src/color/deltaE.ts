/**
 * Color-difference metrics. `76` and `2000` operate in CIE Lab; `ok` operates
 * in Oklab (`deltaEOK`, the metric CSS gamut mapping uses). Inputs are any
 * colors — they are converted to the metric's working space first.
 */

import { convert } from "./convert";
import type { ColorObject, Coords } from "./types";

export type DeltaEMethod = "76" | "2000" | "ok";

/** Euclidean distance between two 3-vectors. */
const dist = (a: Coords, b: Coords): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** CIE76 — plain Euclidean distance in Lab. */
function cie76(a: ColorObject, b: ColorObject): number {
  return dist(convert(a, "lab").coords, convert(b, "lab").coords);
}

/** deltaEOK — Euclidean distance in Oklab. */
function deltaEOK(a: ColorObject, b: ColorObject): number {
  return dist(convert(a, "oklab").coords, convert(b, "oklab").coords);
}

const rad = (deg: number): number => (deg * Math.PI) / 180;
const deg = (r: number): number => (r * 180) / Math.PI;

/** CIEDE2000 — the perceptually-weighted standard (Sharma et al. formulation). */
function ciede2000(a: ColorObject, b: ColorObject): number {
  const [l1, a1, b1] = convert(a, "lab").coords;
  const [l2, a2, b2] = convert(b, "lab").coords;

  const c1 = Math.hypot(a1, b1);
  const c2 = Math.hypot(a2, b2);
  const cBar = (c1 + c2) / 2;
  const g = 0.5 * (1 - Math.sqrt(cBar ** 7 / (cBar ** 7 + 25 ** 7)));

  const a1p = (1 + g) * a1;
  const a2p = (1 + g) * a2;
  const c1p = Math.hypot(a1p, b1);
  const c2p = Math.hypot(a2p, b2);

  const h1p = hueAngle(b1, a1p);
  const h2p = hueAngle(b2, a2p);

  const dLp = l2 - l1;
  const dCp = c2p - c1p;

  let dhp: number;
  if (c1p * c2p === 0) dhp = 0;
  else if (Math.abs(h2p - h1p) <= 180) dhp = h2p - h1p;
  else if (h2p - h1p > 180) dhp = h2p - h1p - 360;
  else dhp = h2p - h1p + 360;
  const dHp = 2 * Math.sqrt(c1p * c2p) * Math.sin(rad(dhp) / 2);

  const lBarP = (l1 + l2) / 2;
  const cBarP = (c1p + c2p) / 2;

  let hBarP: number;
  if (c1p * c2p === 0) hBarP = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) hBarP = (h1p + h2p) / 2;
  else if (h1p + h2p < 360) hBarP = (h1p + h2p + 360) / 2;
  else hBarP = (h1p + h2p - 360) / 2;

  const t
    = 1
      - 0.17 * Math.cos(rad(hBarP - 30))
      + 0.24 * Math.cos(rad(2 * hBarP))
      + 0.32 * Math.cos(rad(3 * hBarP + 6))
      - 0.2 * Math.cos(rad(4 * hBarP - 63));

  const dTheta = 30 * Math.exp(-(((hBarP - 275) / 25) ** 2));
  const rc = 2 * Math.sqrt(cBarP ** 7 / (cBarP ** 7 + 25 ** 7));
  const sl = 1 + (0.015 * (lBarP - 50) ** 2) / Math.sqrt(20 + (lBarP - 50) ** 2);
  const sc = 1 + 0.045 * cBarP;
  const sh = 1 + 0.015 * cBarP * t;
  const rt = -Math.sin(rad(2 * dTheta)) * rc;

  return Math.sqrt((dLp / sl) ** 2 + (dCp / sc) ** 2 + (dHp / sh) ** 2 + rt * (dCp / sc) * (dHp / sh));
}

/** Hue angle in `[0, 360)` for `atan2(y, x)`; 0 when both are 0. */
function hueAngle(y: number, x: number): number {
  if (x === 0 && y === 0) return 0;
  const h = deg(Math.atan2(y, x));
  return h < 0 ? h + 360 : h;
}

/** Color difference between `a` and `b`. Defaults to CIEDE2000. */
export function deltaE(a: ColorObject, b: ColorObject, method: DeltaEMethod = "2000"): number {
  if (method === "76") return cie76(a, b);
  if (method === "ok") return deltaEOK(a, b);
  return ciede2000(a, b);
}

export { deltaEOK };

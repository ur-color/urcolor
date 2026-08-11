/**
 * A miniature CSS gradient renderer, for the recipe tests.
 *
 * The recipes claim to be exact algebraic equivalents of the canvas samplers.
 * Asserting that by re-deriving the algebra in the test would only check the
 * derivation against itself, so this evaluates the emitted CSS instead —
 * parsing the strings the builders actually produce and compositing them the
 * way a browser does.
 *
 * It handles only the grammar the builders emit: `rgb()` in modern
 * space-separated notation (so no comma ever appears inside a color), `#fff`
 * and `#000`, and the three gradient functions with a single direction or
 * origin. Anything else throws rather than guessing.
 */

/** Straight (non-premultiplied) RGBA in 0..1. */
export type Rgba = [number, number, number, number];

function parseColor(input: string): Rgba {
  const text = input.trim();
  if (text === "#fff") return [1, 1, 1, 1];
  if (text === "#000") return [0, 0, 0, 1];

  const fn = /^rgb\(([^)]*)\)$/.exec(text);
  if (!fn) throw new Error(`unsupported color: ${text}`);
  const [channels = "", alpha] = fn[1]!.split("/");
  const [r, g, b] = channels.trim().split(/\s+/).map(Number);
  return [r! / 255, g! / 255, b! / 255, alpha === undefined ? 1 : Number(alpha)];
}

interface Stop {
  color: Rgba;
  /** Position in 0..1, or null when it should be spread evenly. */
  position: number | null;
}

/** Split on commas — safe because every color we emit is comma-free. */
function splitArgs(body: string): string[] {
  return body.split(",").map(s => s.trim());
}

function parseStops(args: string[]): Stop[] {
  const stops = args.map((arg) => {
    const match = /^(.*?)\s+(-?[\d.]+)%$/.exec(arg);
    if (match) return { color: parseColor(match[1]!), position: Number(match[2]) / 100 };
    return { color: parseColor(arg), position: null };
  });
  return stops.map((stop, i) => ({
    ...stop,
    position: stop.position ?? i / (stops.length - 1),
  }));
}

/** Interpolate a stop list in premultiplied sRGB, as gradients are specified to. */
function sample(stops: Stop[], t: number): Rgba {
  const first = stops[0]!;
  const last = stops[stops.length - 1]!;
  if (t <= first.position!) return first.color;
  if (t >= last.position!) return last.color;

  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1]!;
    const b = stops[i]!;
    if (t > b.position!) continue;
    const span = b.position! - a.position!;
    // A doubled position is a hard stop: the later color wins outright.
    if (span === 0) return b.color;
    const f = (t - a.position!) / span;
    const alpha = a.color[3] + (b.color[3] - a.color[3]) * f;
    const rgb = [0, 1, 2].map((c) => {
      const pre = a.color[c]! * a.color[3] + (b.color[c]! * b.color[3] - a.color[c]! * a.color[3]) * f;
      return alpha === 0 ? 0 : pre / alpha;
    });
    return [rgb[0]!, rgb[1]!, rgb[2]!, alpha];
  }
  return last.color;
}

/** Where along a gradient's axis the point `(x, y)` falls, with y=0 at the top. */
function positionOf(kind: string, head: string, x: number, y: number): number {
  if (kind === "linear") {
    switch (head) {
      case "to right": return x;
      case "to left": return 1 - x;
      case "to bottom": return y;
      case "to top": return 1 - y;
      default: throw new Error(`unsupported direction: ${head}`);
    }
  }
  if (kind === "radial") {
    if (head !== "circle closest-side") throw new Error(`unsupported radial: ${head}`);
    // closest-side on a unit square puts the edge at 0.5 from the center.
    return Math.min(1, Math.hypot(x - 0.5, y - 0.5) / 0.5);
  }
  const from = /^from\s+(-?[\d.]+)deg$/.exec(head);
  if (!from) throw new Error(`unsupported conic origin: ${head}`);
  // The same measurement sampleConicRing makes: clockwise from the top.
  const degrees = (Math.atan2(x - 0.5, 0.5 - y) * 180) / Math.PI - Number(from[1]);
  return (((degrees % 360) + 360) % 360) / 360;
}

/** Evaluate one `background-image` value at `(x, y)`. */
export function evalImage(image: string, x: number, y: number): Rgba {
  const match = /^(linear|radial|conic)-gradient\((.*)\)$/.exec(image.trim());
  if (!match) throw new Error(`unsupported image: ${image}`);
  const [kind, body] = [match[1]!, match[2]!];

  const args = splitArgs(body);
  const head = args[0]!;
  const hasHead = kind !== "linear" || /^to /.test(head);
  const stops = parseStops(hasHead ? args.slice(1) : args);
  const t = hasHead ? positionOf(kind, head, x, y) : positionOf(kind, "to bottom", x, y);
  return sample(stops, t);
}

/** Composite `src` over `dst`, both straight RGBA. */
function over(src: Rgba, dst: Rgba): Rgba {
  const alpha = src[3] + dst[3] * (1 - src[3]);
  const rgb = [0, 1, 2].map((c) => {
    const pre = src[c]! * src[3] + dst[c]! * dst[3] * (1 - src[3]);
    return alpha === 0 ? 0 : pre / alpha;
  });
  return [rgb[0]!, rgb[1]!, rgb[2]!, alpha];
}

export interface EvalLayer {
  image: string;
  mask?: string;
}

/**
 * Composite a bottom-first layer list at `(x, y)`, over an opaque black ground
 * so the result is directly comparable to what the canvas samplers write.
 *
 * A layer's `mask` multiplies its alpha, which is what `mask-image` does in
 * `match-source` mode.
 */
export function evalLayers(layers: EvalLayer[], x: number, y: number): Rgba {
  let out: Rgba = [0, 0, 0, 1];
  for (const layer of layers) {
    const color = evalImage(layer.image, x, y);
    const alpha = layer.mask ? color[3] * evalImage(layer.mask, x, y)[3] : color[3];
    out = over([color[0], color[1], color[2], alpha], out);
  }
  return out;
}

/**
 * Mapping client coordinates onto an element that may carry a CSS transform.
 *
 * `getBoundingClientRect` reports the *transformed* box: rotate an element and
 * the rectangle is the axis-aligned bounds of the rotated shape, with its own
 * width and height. Every control here converts a pointer position into a
 * fraction of its box and then reads that fraction against geometry expressed
 * in the element's own untransformed space, so measuring the transformed
 * rectangle mixes the two frames and the pointer lands in the wrong place.
 *
 * Only the element's own transform is undone. An ancestor transform is not
 * recoverable from this element alone, and was never handled before either.
 */

/** An element's untransformed box, and the mapping into it. */
export interface BoxMeasure {
  /** Untransformed border-box width, in CSS pixels. */
  readonly width: number;
  /** Untransformed border-box height, in CSS pixels. */
  readonly height: number;
  /** The transformed bounds, exactly as `getBoundingClientRect` reports them. */
  readonly rect: DOMRect;
  /**
   * Client coordinates as a fraction of the untransformed box: `0,0` at its
   * top left and `1,1` at its bottom right, whatever the element is rotated,
   * scaled or skewed by. Deliberately unclamped, so a caller can still tell
   * that a point landed outside.
   */
  normalize(clientX: number, clientY: number): { x: number; y: number };
}

/** `transform-origin` resolves to pixels on a laid-out element. */
function parseOrigin(origin: string): [number, number] {
  const parts = origin.split(" ");
  const x = Number.parseFloat(parts[0] ?? "");
  const y = Number.parseFloat(parts[1] ?? "");
  return [Number.isFinite(x) ? x : 0, Number.isFinite(y) ? y : 0];
}

/** A computed value that was never set. */
function isNone(value: string | undefined): boolean {
  return !value || value === "none";
}

/**
 * `translate` as a transform function, its percentages resolved.
 *
 * Percentages are relative to the element's own border box, which
 * `DOMMatrix` has no way to know, so they are converted here.
 */
function translateFunction(value: string, width: number, height: number): string {
  const axes = [width, height];
  const parts = value.split(" ").map((part, i) => {
    if (!part.endsWith("%")) return part;
    const ratio = Number.parseFloat(part) / 100;
    return `${ratio * (axes[i] ?? 0)}px`;
  });
  return `translate3d(${[parts[0] ?? "0", parts[1] ?? "0", parts[2] ?? "0"].join(", ")})`;
}

/**
 * `scale` as a transform function.
 *
 * A single value scales both axes, unlike `translate`, where a single value
 * leaves the second axis alone.
 */
function scaleFunction(value: string): string {
  const parts = value.split(" ");
  const x = parts[0] ?? "1";
  return `scale3d(${x}, ${parts[1] ?? x}, ${parts[2] ?? "1"})`;
}

/**
 * `rotate` as a transform function, or `null` for the axis forms.
 *
 * A rotation about anything but Z takes the element off its own plane, which
 * the plain path handles by ignoring the transform entirely.
 */
function rotateFunction(value: string): string | null {
  const parts = value.split(" ");
  if (parts.length === 1) return `rotate(${parts[0]})`;
  if (parts.length === 2 && parts[0] === "z") return `rotate(${parts[1]})`;
  return null;
}

/**
 * The element's own transform, as a matrix mapping untransformed local
 * coordinates to the frame the transform leaves them in, `transform-origin`
 * folded in.
 *
 * `translate`, `rotate` and `scale` are independent properties, not shorthands
 * for `transform`: an element carrying `rotate: 90deg` reports `transform:
 * none`, and Tailwind's `rotate-*` utilities emit exactly that. All four
 * compose, in the order CSS Transforms Level 2 applies them.
 *
 * `null` means there is nothing to undo — no transform, an identity one, a
 * rotation off the element's plane, or an environment without the APIs to read
 * it. Every caller then takes the plain path, which is what the components did
 * before transforms were considered.
 */
function ownTransform(el: HTMLElement, width: number, height: number): DOMMatrix | null {
  if (typeof DOMMatrix === "undefined" || typeof getComputedStyle !== "function") return null;

  try {
    const style = getComputedStyle(el);
    const { translate, rotate, scale, transform } = style;
    if (isNone(translate) && isNone(rotate) && isNone(scale) && isNone(transform)) return null;

    const functions: string[] = [];
    if (!isNone(translate)) functions.push(translateFunction(translate, width, height));
    if (!isNone(rotate)) {
      const rotation = rotateFunction(rotate);
      if (!rotation) return null;
      functions.push(rotation);
    }
    if (!isNone(scale)) functions.push(scaleFunction(scale));
    if (!isNone(transform)) functions.push(transform);

    const matrix = new DOMMatrix(functions.join(" "));
    // A 3D transform is a projection, not an affine map, so inverting it does
    // not give back a position on the element's plane. Left to the plain path.
    if (!matrix.is2D || matrix.isIdentity) return null;

    const [ox, oy] = parseOrigin(style.transformOrigin);
    return new DOMMatrix().translate(ox, oy).multiply(matrix).translate(-ox, -oy);
  } catch {
    // An unparseable transform, or an element the host cannot resolve styles
    // for. Neither is worth failing a gesture over.
    return null;
  }
}

/** The mapping used when there is no transform to undo. */
function plainMeasure(rect: DOMRect): BoxMeasure {
  return {
    width: rect.width,
    height: rect.height,
    rect,
    normalize(clientX, clientY) {
      return {
        x: rect.width === 0 ? 0 : (clientX - rect.left) / rect.width,
        y: rect.height === 0 ? 0 : (clientY - rect.top) / rect.height,
      };
    },
  };
}

/**
 * Measure an element once, for the duration of a gesture.
 *
 * Both `getBoundingClientRect` and `getComputedStyle` force layout, so this is
 * called at `pointerdown` and the result reused for every move — re-measuring
 * per move is the dominant cost of a drag.
 */
export function measureBox(el: HTMLElement): BoxMeasure {
  const rect = el.getBoundingClientRect();

  // `offsetWidth` rounds to whole pixels, so it is only the fallback: the
  // untransformed size is what the rect already reports on the plain path.
  const width = el.offsetWidth || rect.width;
  const height = el.offsetHeight || rect.height;

  const matrix = ownTransform(el, width, height);
  if (!matrix) return plainMeasure(rect);

  // `rect` is the axis-aligned bounds of the transformed box, so its top left
  // is the smallest transformed corner — not the image of the local origin.
  // Transforming the corners here recovers that offset, which is the only
  // unknown between local coordinates and client ones.
  const corners = [[0, 0], [width, 0], [width, height], [0, height]]
    .map(([x, y]) => matrix.transformPoint(new DOMPoint(x, y)));
  const minX = Math.min(...corners.map(p => p.x));
  const minY = Math.min(...corners.map(p => p.y));

  const inverse = matrix.inverse();

  return {
    width,
    height,
    rect,
    normalize(clientX, clientY) {
      const local = inverse.transformPoint(
        new DOMPoint(clientX - rect.left + minX, clientY - rect.top + minY),
      );
      return {
        x: width === 0 ? 0 : local.x / width,
        y: height === 0 ? 0 : local.y / height,
      };
    },
  };
}

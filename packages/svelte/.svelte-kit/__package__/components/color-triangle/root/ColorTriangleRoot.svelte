<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { Color, SpaceId } from "@urcolor/core";
  import type { ChildSnippetArgs } from "../../../shared/child.js";

  export interface ColorTriangleRootProps extends HTMLAttributes<HTMLDivElement> {
    /** The colour value. Bindable: `bind:value`. */
    value?: Color | string | null;
    /** The colour used until the first interaction when `value` is not bound. */
    defaultValue?: Color | string | null;
    /** The colour space mode (e.g. `"hsv"`, `"oklch"`). */
    colorSpace?: SpaceId;
    /** The channel mapped to the first vertex. Defaults to the space's second channel. */
    xChannel?: string;
    /** The channel mapped to the second vertex. Defaults to the space's third channel. */
    yChannel?: string;
    /** The channel mapped to the third vertex. Supplying it switches the triangle to a three-channel simplex. */
    zChannel?: string;
    /** Rotation of the triangle, in degrees. */
    /** Swaps the second and third vertices, mirroring the triangle. */
    inverted?: boolean;
    /** Whether the thumb is centred on the edge (`"overflow"`) or kept inside it. */
    thumbAlignment?: "contain" | "overflow";
    /** When true, prevents the user from interacting with the triangle. */
    disabled?: boolean;
    /** Called on every change, including mid-drag. */
    onValueChange?: (color: Color) => void;
    /** Called once at the end of an interaction. */
    onValueCommit?: (color: Color) => void;
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
  }
</script>

<script lang="ts">
  import { untrack } from "svelte";
  import { createAttachmentKey } from "svelte/attachments";
    import { Color as ColorClass } from "@urcolor/core";
  import {
    applyDisplayValues,
    barycentricCoords,
    clampToTriangle,
    colorSpaces,
    colorToDisplayValue,
    createDragController,
    DATA_COLOR_TRIANGLE_ROOT,
    DATA_DISABLED,
    DATA_DRAGGING,
    FEEDBACK_EPSILON,
    insetTriangle,
    parseColor,
    pointInTriangle,
    resolveChannelConfig,
    snapToStep,
    stepMultiplier,
    triangleVertices,
    type Point,
  } from "@urcolor/shared";
  import type { ChildProps } from "../../../shared/child.js";
  import { colorTriangleContext } from "./context.svelte.js";

  const DEFAULT_COLOR = ColorClass.parse("hsl(0, 100%, 50%)")!;

  /** `PageUp`/`PageDown` move the second channel by this many steps. */
  const PAGE_STEPS = 10;

  /**
   * The merged thumb is a single focus target, so the arrows drive the first two
   * channels directly. There is no third-axis key: in three-channel mode the z
   * channel falls out of the barycentric renormalisation of the other two.
   */
  const STEP_KEYS: Record<string, { axis: "x" | "y"; sign: 1 | -1 }> = {
    ArrowRight: { axis: "x", sign: 1 },
    ArrowLeft: { axis: "x", sign: -1 },
    ArrowUp: { axis: "y", sign: 1 },
    ArrowDown: { axis: "y", sign: -1 },
  };

  let {
    value = $bindable(),
    defaultValue,
    colorSpace = "hsv",
    xChannel,
    yChannel,
    zChannel,
    inverted = false,
    thumbAlignment = "overflow",
    disabled = false,
    onValueChange,
    onValueCommit,
    class: className,
    style,
    children,
    child,
    ...rest
  }: ColorTriangleRootProps = $props();

  /**
   * Uncontrolled fallback, kept in sync so it and `value` never disagree.
   * `untrack` states the intent that only the initial props are read here.
   */
  let internalColor = $state<Color>(
    untrack(() => parseColor(value) ?? parseColor(defaultValue) ?? DEFAULT_COLOR),
  );
  let dragging = $state(false);
  /** Plain, non-reactive: only the drag controller reads it, and only on pointer events. */
  let element: HTMLElement | null = null;
  /** The shorter side of the root box, and the longer side of the thumb, both in CSS pixels. */
  let rootSize = $state(0);
  let thumbSize = $state(0);

  const color = $derived(parseColor(value) ?? internalColor);

  const xChannelKey = $derived(xChannel ?? colorSpaces[colorSpace]?.channels[1]?.key ?? "s");
  const yChannelKey = $derived(yChannel ?? colorSpaces[colorSpace]?.channels[2]?.key ?? "v");
  const zChannelKey = $derived(zChannel);
  const isThreeChannel = $derived(zChannelKey !== undefined);

  const xConfig = $derived(resolveChannelConfig(colorSpace, xChannelKey));
  const yConfig = $derived(resolveChannelConfig(colorSpace, yChannelKey));
  const zConfig = $derived(zChannelKey === undefined ? undefined : resolveChannelConfig(colorSpace, zChannelKey));

  const minX = $derived(xConfig?.min ?? 0);
  const maxX = $derived(xConfig?.max ?? 100);
  const stepX = $derived(xConfig?.step ?? 1);
  const minY = $derived(yConfig?.min ?? 0);
  const maxY = $derived(yConfig?.max ?? 100);
  const stepY = $derived(yConfig?.step ?? 1);
  const minZ = $derived(zConfig?.min ?? 0);
  const maxZ = $derived(zConfig?.max ?? 100);
  const stepZ = $derived(zConfig?.step ?? 1);

  const valueX = $derived(colorToDisplayValue(color, colorSpace, xChannelKey));
  const valueY = $derived(colorToDisplayValue(color, colorSpace, yChannelKey));
  const valueZ = $derived(zChannelKey === undefined ? minZ : colorToDisplayValue(color, colorSpace, zChannelKey));

  /** The three corners in normalised 0-1 space. `inverted` swaps the last two. */
  const vertices = $derived.by<[Point, Point, Point]>(() => {
    const [v0, v1, v2] = triangleVertices(1, 1);
    return inverted ? [v0, v2, v1] : [v0, v1, v2];
  });

  /**
   * In `"contain"` mode the thumb is positioned against a triangle inset by half
   * its own size, so its box stays inside the outline instead of straddling it.
   * The pointer maps onto the same inset triangle, so the point under the cursor
   * and the thumb centre keep agreeing at the corners.
   */
  const positionVertices = $derived.by<[Point, Point, Point]>(() => {
    const [v0, v1, v2] = vertices;
    if (thumbAlignment !== "contain" || rootSize <= 0 || thumbSize <= 0) return [v0, v1, v2];
    const inset = thumbSize / 2 / rootSize;
    if (inset <= 0) return [v0, v1, v2];
    return insetTriangle(v0, v1, v2, inset);
  });

  const clipPath = $derived(
    `clip-path:polygon(${vertices.map(p => `${(p.x * 100).toFixed(2)}% ${(p.y * 100).toFixed(2)}%`).join(", ")});`,
  );

  /** Writes the two or three display-space channel values back as a single colour. */
  function writeValues(xRaw: number, yRaw: number, zRaw?: number): void {
    if (!xConfig || !yConfig) return;
    const nextX = snapToStep(xRaw, minX, maxX, stepX);
    const nextY = snapToStep(yRaw, minY, maxY, stepY);
    const nextZ = zRaw === undefined ? undefined : snapToStep(zRaw, minZ, maxZ, stepZ);

    const moved
      = Math.abs(nextX - valueX) >= FEEDBACK_EPSILON
        || Math.abs(nextY - valueY) >= FEEDBACK_EPSILON
        || (nextZ !== undefined && Math.abs(nextZ - valueZ) >= FEEDBACK_EPSILON);
    if (!moved) return;

    const nextColor
      = isThreeChannel && zChannelKey !== undefined
        ? applyDisplayValues(color, colorSpace, [xChannelKey, yChannelKey, zChannelKey], [nextX, nextY, nextZ ?? valueZ])
        : applyDisplayValues(color, colorSpace, [xChannelKey, yChannelKey], [nextX, nextY]);

    internalColor = nextColor;
    value = nextColor;
    onValueChange?.(nextColor);
  }

  function commit(): void {
    onValueCommit?.(color);
  }

  /** Barycentric weights back to display-space channel values. */
  function baryToChannels(u: number, v: number, w: number): { x: number; y: number; z?: number } {
    if (isThreeChannel) {
      return {
        x: u * maxX + (1 - u) * minX,
        y: v * maxY + (1 - v) * minY,
        z: w * maxZ + (1 - w) * minZ,
      };
    }
    return {
      x: u * maxX + (1 - u) * minX,
      y: (1 - w) * maxY + w * minY,
    };
  }

  /**
   * Write one or more axes, keeping the resulting point inside the triangle.
   *
   * Only the axes present in `partial` count as driven; the others are held at
   * their current value and may be given way by the in-triangle clamp.
   */
  function setChannelValues(partial: { x?: number; y?: number; z?: number }): void {
    const hasX = partial.x !== undefined;
    const hasY = partial.y !== undefined;

    let nextX = partial.x === undefined ? valueX : snapToStep(partial.x, minX, maxX, stepX);
    let nextY = partial.y === undefined ? valueY : snapToStep(partial.y, minY, maxY, stepY);
    let nextZ = partial.z === undefined ? valueZ : snapToStep(partial.z, minZ, maxZ, stepZ);

    const xRange = maxX - minX;
    const yRange = maxY - minY;
    const zRange = maxZ - minZ;

    if (isThreeChannel) {
      // Barycentric simplex: only the ratio between the three channels is
      // meaningful, so renormalise all three back onto u + v + w === 1.
      if (xRange > 0 && yRange > 0 && zRange > 0) {
        const u = Math.max(0, (nextX - minX) / xRange);
        const v = Math.max(0, (nextY - minY) / yRange);
        const w = Math.max(0, (nextZ - minZ) / zRange);
        const sum = u + v + w;
        const values = baryToChannels(
          sum > 0 ? u / sum : 1 / 3,
          sum > 0 ? v / sum : 1 / 3,
          sum > 0 ? w / sum : 1 / 3,
        );
        nextX = values.x;
        nextY = values.y;
        nextZ = values.z ?? nextZ;
      }
      writeValues(nextX, nextY, nextZ);
      return;
    }

    // Two-channel: the reachable region is the half-simplex u + w <= 1. When a
    // step pushes past the hypotenuse, give way on the axis that was not driven.
    if (xRange > 0 && yRange > 0) {
      const u = (nextX - minX) / xRange;
      const w = (maxY - nextY) / yRange;
      if (u + w > 1) {
        if (hasY && !hasX) nextX = minX + (1 - w) * xRange;
        else nextY = maxY - (1 - u) * yRange;
      }
    }

    writeValues(nextX, nextY);
  }

  /** Maps a point on the element onto channel values through its barycentric weights. */
  function valuesFromPoint(normalizedX: number, normalizedY: number): { x: number; y: number; z?: number } {
    const [v0, v1, v2] = positionVertices;
    const clamped = clampToTriangle(normalizedX, normalizedY, v0, v1, v2);
    const { u, v, w } = barycentricCoords(clamped.x, clamped.y, v0, v1, v2);
    const cu = Math.max(0, u);
    const cv = Math.max(0, v);
    const cw = Math.max(0, w);
    const sum = cu + cv + cw || 1;
    const nu = cu / sum;
    const nv = cv / sum;
    const nw = cw / sum;

    if (isThreeChannel) {
      // v0 → (xMax, yMin, zMin), v1 → (xMin, yMax, zMin), v2 → (xMin, yMin, zMax)
      return {
        x: nu * maxX + (1 - nu) * minX,
        y: nv * maxY + (1 - nv) * minY,
        z: nw * maxZ + (1 - nw) * minZ,
      };
    }
    // v0 → (xMax, yMax), v1 → (xMin, yMax), v2 → (xMin, yMin)
    return {
      x: nu * maxX + nv * minX + nw * minX,
      y: nu * maxY + nv * maxY + nw * minY,
    };
  }

  /** The axes a key drives, or undefined when the key is not ours. */
  function partialFromKey(event: KeyboardEvent): { x?: number; y?: number } | undefined {
    if (disabled) return undefined;

    if (event.key === "Home") return { x: minX, y: minY };
    if (event.key === "End") return { x: maxX, y: maxY };
    if (event.key === "PageUp") return { y: valueY + stepY * PAGE_STEPS };
    if (event.key === "PageDown") return { y: valueY - stepY * PAGE_STEPS };

    const delta = STEP_KEYS[event.key];
    if (!delta) return undefined;

    const offset = delta.sign * stepMultiplier(event);
    return delta.axis === "x" ? { x: valueX + stepX * offset } : { y: valueY + stepY * offset };
  }

  const drag = createDragController({
    getElement: () => element,
    isDisabled: () => disabled,
    // A press outside the outline is not ours, even though the root's box is a
    // full square; the clip path hides it but does not stop the event.
    hitTest: (point) => {
      const [v0, v1, v2] = vertices;
      return pointInTriangle(point.normalizedX, point.normalizedY, v0, v1, v2);
    },
    onStart: () => {
      dragging = true;
    },
    onMove: (point) => {
      const values = valuesFromPoint(point.normalizedX, point.normalizedY);
      writeValues(values.x, values.y, values.z);
    },
    onEnd: () => {
      dragging = false;
      commit();
    },
  });

  const attachmentKey = createAttachmentKey();

  /**
   * The family's single behaviour attachment: pointer capture, keyboard, and
   * the element that position→value is measured against.
   *
   * It travels inside the props object under a `Symbol` key, so a consumer
   * spreading those props onto their own element — or onto another component —
   * gets the full interaction, which an `onpointerdown` prop bag could not do.
   * Keyboard lives here too rather than on the thumb: `keydown` from the
   * focused thumb bubbles to this element, so one attachment covers both.
   */
  function interaction(node: HTMLElement): () => void {
    element = node;
    rootSize = Math.min(node.clientWidth, node.clientHeight);
    let keyboardActive = false;

    const onPointerDown = (event: PointerEvent): void => {
      drag.pointerDown(event);
      // `pointerDown` calls `preventDefault`, which suppresses the focus the
      // browser would have moved to the thumb; do it explicitly instead.
      if (drag.isDragging) node.querySelector<HTMLElement>("[role='slider']")?.focus();
    };
    const onPointerMove = (event: PointerEvent): void => drag.pointerMove(event);
    const onPointerUp = (event: PointerEvent): void => drag.pointerUp(event);
    const onPointerCancel = (): void => {
      drag.pointerCancel();
      dragging = false;
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      const partial = partialFromKey(event);
      if (!partial) return;
      event.preventDefault();
      keyboardActive = true;
      setChannelValues(partial);
    };
    const onKeyUp = (): void => {
      if (!keyboardActive) return;
      keyboardActive = false;
      commit();
    };

    node.addEventListener("pointerdown", onPointerDown);
    node.addEventListener("pointermove", onPointerMove);
    node.addEventListener("pointerup", onPointerUp);
    node.addEventListener("pointercancel", onPointerCancel);
    node.addEventListener("keydown", onKeyDown);
    node.addEventListener("keyup", onKeyUp);

    // The `"contain"` inset is a ratio of two measured boxes, so it has to be
    // re-measured when either of them changes size.
    const observer
      = typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(() => {
            rootSize = Math.min(node.clientWidth, node.clientHeight);
          });
    observer?.observe(node);

    return () => {
      node.removeEventListener("pointerdown", onPointerDown);
      node.removeEventListener("pointermove", onPointerMove);
      node.removeEventListener("pointerup", onPointerUp);
      node.removeEventListener("pointercancel", onPointerCancel);
      node.removeEventListener("keydown", onKeyDown);
      node.removeEventListener("keyup", onKeyUp);
      observer?.disconnect();
      drag.cancel();
      dragging = false;
      rootSize = 0;
      element = null;
    };
  }

  /** Called by the thumb's own attachment; see `registerThumb` on the context. */
  function registerThumb(node: HTMLElement): () => void {
    thumbSize = Math.max(node.clientWidth, node.clientHeight);
    const observer
      = typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(() => {
            thumbSize = Math.max(node.clientWidth, node.clientHeight);
          });
    observer?.observe(node);
    return () => {
      observer?.disconnect();
      thumbSize = 0;
    };
  }

  const elementProps = $derived<ChildProps>({
    ...rest,
    "aria-disabled": disabled ? true : undefined,
    "class": className,
    // The caller's declarations come last so they win the cascade.
    "style": style ? `${clipPath}${style}` : clipPath,
    [DATA_COLOR_TRIANGLE_ROOT]: "",
    [DATA_DISABLED]: disabled ? "" : undefined,
    [DATA_DRAGGING]: dragging ? "" : undefined,
    [attachmentKey]: interaction,
  });

  colorTriangleContext.set({
    get color() {
      return color;
    },
    get colorSpace() {
      return colorSpace;
    },
    get xChannelKey() {
      return xChannelKey;
    },
    get yChannelKey() {
      return yChannelKey;
    },
    get zChannelKey() {
      return zChannelKey;
    },
    get isThreeChannel() {
      return isThreeChannel;
    },
    get minX() {
      return minX;
    },
    get maxX() {
      return maxX;
    },
    get minY() {
      return minY;
    },
    get maxY() {
      return maxY;
    },
    get minZ() {
      return minZ;
    },
    get maxZ() {
      return maxZ;
    },
    get valueX() {
      return valueX;
    },
    get valueY() {
      return valueY;
    },
    get valueZ() {
      return valueZ;
    },
    get vertices() {
      return vertices;
    },
    get positionVertices() {
      return positionVertices;
    },
    get thumbAlignment() {
      return thumbAlignment;
    },
    get disabled() {
      return disabled;
    },
    get dragging() {
      return dragging;
    },
    registerThumb,
  });
</script>

{#if child}
  {@render child({ props: elementProps })}
{:else}
  <div {...elementProps}>{@render children?.()}</div>
{/if}

import {
  afterNextRender,
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  HostAttributeToken,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
} from "@angular/core";
import type { FormValueControl } from "@angular/forms/signals";
import {
  barycentricCoords,
  clampToTriangle,
  Color,
  colorSpaces,
  insetTriangle,
  pointInTriangle,
  triangleVertices,
  type Point,
  type SpaceId,
} from "@urcolor/core";
import {
  applyDisplayValues,
  colorToDisplayValue,
  createDragController,
  DATA_COLOR_TRIANGLE_ROOT,
  DATA_DISABLED,
  DATA_DRAGGING,
  FEEDBACK_EPSILON,
  resolveChannelConfig,
  snapToStep,
  stepMultiplier,
} from "@urcolor/primitives";

/** Whether the thumb straddles the outline or is kept inside it. */
export type ColorTriangleThumbAlignment = "contain" | "overflow";

/** The colour a root falls back to when `[(value)]` is never bound. */
export const COLOR_TRIANGLE_DEFAULT_COLOR: Color = Color.parse("hsl(0, 100%, 50%)")!;

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

/**
 * The root of a colour triangle. Owns the colour, the interaction, the triangle
 * geometry, and every piece of state the other parts read through
 * `inject(ColorTriangleRoot)`.
 *
 * ```html
 * <div urcColorTriangleRoot [(value)]="color" colorSpace="hsv">
 *   <canvas urcColorTriangleGradient></canvas>
 *   <span urcColorTriangleThumb></span>
 * </div>
 * ```
 *
 * Supplying `zChannel` switches the triangle from a two-channel half-simplex to
 * a full three-channel barycentric simplex.
 *
 * `implements FormValueControl<Color>` is satisfied by the `value` model alone,
 * which is what makes `<div urcColorTriangleRoot [field]="form.brandColor">` work.
 */
@Directive({
  selector: "[urcColorTriangleRoot]",
  exportAs: "urcColorTriangleRoot",
  host: {
    [`[attr.${DATA_COLOR_TRIANGLE_ROOT}]`]: "''",
    [`[attr.${DATA_DISABLED}]`]: "isDisabled() ? '' : null",
    [`[attr.${DATA_DRAGGING}]`]: "dragging() ? '' : null",
    "[attr.aria-disabled]": "isDisabled() ? 'true' : null",
    "[style.clip-path]": "clipPath()",
    "(pointerdown)": "onPointerDown($event)",
    "(pointermove)": "onPointerMove($event)",
    "(pointerup)": "onPointerUp($event)",
    "(pointercancel)": "onPointerCancel()",
    "(keydown)": "onKeyDown($event)",
    "(keyup)": "onKeyUp()",
  },
})
export class ColorTriangleRoot implements FormValueControl<Color> {
  /** The colour, two-way bindable as `[(value)]`. Also the Signal Forms contract. */
  readonly value = model<Color>(COLOR_TRIANGLE_DEFAULT_COLOR);
  /** Emitted once at the end of an interaction, never mid-drag. */
  readonly valueCommit = output<Color>();

  /** The colour space the triangle operates in. */
  readonly colorSpace = input<SpaceId>("hsv");
  /** The channel mapped to the first vertex. Defaults to the space's second channel. */
  readonly xChannel = input<string>();
  /** The channel mapped to the second vertex. Defaults to the space's third channel. */
  readonly yChannel = input<string>();
  /** The channel mapped to the third vertex. Supplying it selects the three-channel simplex. */
  readonly zChannel = input<string>();
  /** Rotation of the triangle, in degrees. */
  readonly rotation = input(0, { transform: numberAttribute });
  /** Swaps the second and third vertices, mirroring the triangle. */
  readonly inverted = input(false, { transform: booleanAttribute });
  /** Whether the thumb is centred on the edge (`"overflow"`) or kept inside it. */
  readonly thumbAlignment = input<ColorTriangleThumbAlignment>("overflow");

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * `disabled` is DOM state, not an input. The static host attribute is read at
   * construction — which works under SSR, where there is no DOM — and a
   * `MutationObserver` installed after the first render keeps it live.
   */
  private readonly disabledState = signal(
    inject(new HostAttributeToken("disabled"), { optional: true }) !== null,
  );

  private readonly draggingState = signal(false);

  /**
   * Whether interaction is refused. Named `isDisabled` rather than `disabled`
   * because `FormUiControl` reserves `disabled` for an `InputSignal<boolean>`.
   */
  readonly isDisabled = this.disabledState.asReadonly();
  /** True while a pointer drag is in flight. */
  readonly dragging = this.draggingState.asReadonly();

  /** The shorter side of the root box, in CSS pixels. Only `"contain"` reads it. */
  private readonly rootSize = signal(0);
  /** The longer side of the registered thumb, in CSS pixels. */
  private readonly thumbSize = signal(0);

  /** The channel at the first vertex. */
  readonly xChannelKey = computed(
    () => this.xChannel() ?? colorSpaces[this.colorSpace()]?.channels[1]?.key ?? "s",
  );

  /** The channel at the second vertex. */
  readonly yChannelKey = computed(
    () => this.yChannel() ?? colorSpaces[this.colorSpace()]?.channels[2]?.key ?? "v",
  );

  /** The channel at the third vertex, or `undefined` in two-channel mode. */
  readonly zChannelKey = computed(() => this.zChannel());
  /** True when a third channel turns the half-simplex into a full simplex. */
  readonly isThreeChannel = computed(() => this.zChannelKey() !== undefined);

  private readonly xConfig = computed(() =>
    resolveChannelConfig(this.colorSpace(), this.xChannelKey()),
  );

  private readonly yConfig = computed(() =>
    resolveChannelConfig(this.colorSpace(), this.yChannelKey()),
  );

  private readonly zConfig = computed(() => {
    const channel = this.zChannelKey();
    return channel === undefined ? undefined : resolveChannelConfig(this.colorSpace(), channel);
  });

  /** Display-space bounds of the first channel. */
  readonly minX = computed(() => this.xConfig()?.min ?? 0);
  readonly maxX = computed(() => this.xConfig()?.max ?? 100);
  private readonly stepX = computed(() => this.xConfig()?.step ?? 1);
  /** Display-space bounds of the second channel. */
  readonly minY = computed(() => this.yConfig()?.min ?? 0);
  readonly maxY = computed(() => this.yConfig()?.max ?? 100);
  private readonly stepY = computed(() => this.yConfig()?.step ?? 1);
  /** Display-space bounds of the third channel. Inert in two-channel mode. */
  readonly minZ = computed(() => this.zConfig()?.min ?? 0);
  readonly maxZ = computed(() => this.zConfig()?.max ?? 100);
  private readonly stepZ = computed(() => this.zConfig()?.step ?? 1);

  /** The first channel of the current colour, in display units. */
  readonly valueX = computed(() =>
    colorToDisplayValue(this.value(), this.colorSpace(), this.xChannelKey()),
  );

  /** The second channel of the current colour, in display units. */
  readonly valueY = computed(() =>
    colorToDisplayValue(this.value(), this.colorSpace(), this.yChannelKey()),
  );

  /** The third channel of the current colour, or `minZ` in two-channel mode. */
  readonly valueZ = computed(() => {
    const channel = this.zChannelKey();
    return channel === undefined
      ? this.minZ()
      : colorToDisplayValue(this.value(), this.colorSpace(), channel);
  });

  /** The three corners in normalised 0-1 space. `inverted` swaps the last two. */
  readonly vertices = computed<[Point, Point, Point]>(() => {
    const [v0, v1, v2] = triangleVertices(1, 1, this.rotation());
    return this.inverted() ? [v0, v2, v1] : [v0, v1, v2];
  });

  /**
   * In `"contain"` mode the thumb is positioned against a triangle inset by half
   * its own size, so its box stays inside the outline instead of straddling it.
   * The pointer maps onto the same inset triangle, so the point under the cursor
   * and the thumb centre keep agreeing at the corners.
   */
  readonly positionVertices = computed<[Point, Point, Point]>(() => {
    const [v0, v1, v2] = this.vertices();
    const rootSize = this.rootSize();
    const thumbSize = this.thumbSize();
    if (this.thumbAlignment() !== "contain" || rootSize <= 0 || thumbSize <= 0) {
      return [v0, v1, v2];
    }
    const inset = thumbSize / 2 / rootSize;
    if (inset <= 0) return [v0, v1, v2];
    return insetTriangle(v0, v1, v2, inset);
  });

  /** The outline, as a CSS `clip-path` polygon. */
  protected readonly clipPath = computed(() => {
    const points = this.vertices()
      .map(point => `${(point.x * 100).toFixed(2)}% ${(point.y * 100).toFixed(2)}%`)
      .join(", ");
    return `polygon(${points})`;
  });

  /** True while a key that changes the value is held down. */
  private keyboardActive = false;

  private readonly drag = createDragController({
    getElement: () => this.host.nativeElement,
    isDisabled: () => this.isDisabled(),
    // A press outside the outline is not ours, even though the root's box is a
    // full square; the clip path hides it but does not stop the event.
    hitTest: (point) => {
      const [v0, v1, v2] = this.vertices();
      return pointInTriangle(point.normalizedX, point.normalizedY, v0, v1, v2);
    },
    onStart: () => this.draggingState.set(true),
    onMove: (point) => {
      const values = this.valuesFromPoint(point.normalizedX, point.normalizedY);
      this.writeValues(values.x, values.y, values.z);
    },
    onEnd: () => {
      this.draggingState.set(false);
      this.valueCommit.emit(this.value());
    },
  });

  constructor() {
    // `afterNextRender` never runs on the server, so this is the only place a
    // directive may touch the DOM.
    afterNextRender(() => {
      const element = this.host.nativeElement;
      this.syncDomState(element);

      if (typeof MutationObserver !== "undefined") {
        const observer = new MutationObserver(() => this.syncDomState(element));
        observer.observe(element, { attributes: true, attributeFilter: ["disabled"] });
        this.destroyRef.onDestroy(() => observer.disconnect());
      }

      // The `"contain"` inset is a ratio of two measured boxes, so it has to be
      // re-measured when either of them changes size.
      if (typeof ResizeObserver !== "undefined") {
        const observer = new ResizeObserver(() => this.measureRoot(element));
        observer.observe(element);
        this.destroyRef.onDestroy(() => observer.disconnect());
      }
    });

    this.destroyRef.onDestroy(() => this.drag.cancel());
  }

  /**
   * Called by the thumb once it is in the DOM. The root cannot query for it —
   * the consumer owns the markup and may nest the thumb arbitrarily deep.
   */
  registerThumb(node: HTMLElement): () => void {
    this.measureThumb(node);
    if (typeof ResizeObserver === "undefined") {
      return () => this.thumbSize.set(0);
    }
    const observer = new ResizeObserver(() => this.measureThumb(node));
    observer.observe(node);
    return () => {
      observer.disconnect();
      this.thumbSize.set(0);
    };
  }

  private measureRoot(element: HTMLElement): void {
    this.rootSize.set(Math.min(element.clientWidth, element.clientHeight));
  }

  private measureThumb(node: HTMLElement): void {
    this.thumbSize.set(Math.max(node.clientWidth, node.clientHeight));
  }

  private syncDomState(element: HTMLElement): void {
    this.disabledState.set(element.hasAttribute("disabled"));
    this.measureRoot(element);
  }

  /** Writes the two or three display-space channel values back as a single colour. */
  private writeValues(xRaw: number, yRaw: number, zRaw?: number): void {
    if (!this.xConfig() || !this.yConfig()) return;

    const nextX = snapToStep(xRaw, this.minX(), this.maxX(), this.stepX());
    const nextY = snapToStep(yRaw, this.minY(), this.maxY(), this.stepY());
    const nextZ
      = zRaw === undefined ? undefined : snapToStep(zRaw, this.minZ(), this.maxZ(), this.stepZ());

    const moved
      = Math.abs(nextX - this.valueX()) >= FEEDBACK_EPSILON
        || Math.abs(nextY - this.valueY()) >= FEEDBACK_EPSILON
        || (nextZ !== undefined && Math.abs(nextZ - this.valueZ()) >= FEEDBACK_EPSILON);
    if (!moved) return;

    const zChannelKey = this.zChannelKey();
    const next
      = this.isThreeChannel() && zChannelKey !== undefined
        ? applyDisplayValues(
            this.value(),
            this.colorSpace(),
            [this.xChannelKey(), this.yChannelKey(), zChannelKey],
            [nextX, nextY, nextZ ?? this.valueZ()],
          )
        : applyDisplayValues(
            this.value(),
            this.colorSpace(),
            [this.xChannelKey(), this.yChannelKey()],
            [nextX, nextY],
          );

    this.value.set(next);
  }

  /** Barycentric weights back to display-space channel values. */
  private baryToChannels(u: number, v: number, w: number): { x: number; y: number; z?: number } {
    if (this.isThreeChannel()) {
      return {
        x: u * this.maxX() + (1 - u) * this.minX(),
        y: v * this.maxY() + (1 - v) * this.minY(),
        z: w * this.maxZ() + (1 - w) * this.minZ(),
      };
    }
    return {
      x: u * this.maxX() + (1 - u) * this.minX(),
      y: (1 - w) * this.maxY() + w * this.minY(),
    };
  }

  /**
   * Write one or more axes, keeping the resulting point inside the triangle.
   *
   * Only the axes present in `partial` count as driven; the others are held at
   * their current value and may be given way by the in-triangle clamp.
   */
  private setChannelValues(partial: { x?: number; y?: number; z?: number }): void {
    const hasX = partial.x !== undefined;
    const hasY = partial.y !== undefined;

    const minX = this.minX();
    const maxX = this.maxX();
    const minY = this.minY();
    const maxY = this.maxY();
    const minZ = this.minZ();
    const maxZ = this.maxZ();

    let nextX
      = partial.x === undefined ? this.valueX() : snapToStep(partial.x, minX, maxX, this.stepX());
    let nextY
      = partial.y === undefined ? this.valueY() : snapToStep(partial.y, minY, maxY, this.stepY());
    let nextZ
      = partial.z === undefined ? this.valueZ() : snapToStep(partial.z, minZ, maxZ, this.stepZ());

    const xRange = maxX - minX;
    const yRange = maxY - minY;
    const zRange = maxZ - minZ;

    if (this.isThreeChannel()) {
      // Barycentric simplex: only the ratio between the three channels is
      // meaningful, so renormalise all three back onto u + v + w === 1.
      if (xRange > 0 && yRange > 0 && zRange > 0) {
        const u = Math.max(0, (nextX - minX) / xRange);
        const v = Math.max(0, (nextY - minY) / yRange);
        const w = Math.max(0, (nextZ - minZ) / zRange);
        const sum = u + v + w;
        const values = this.baryToChannels(
          sum > 0 ? u / sum : 1 / 3,
          sum > 0 ? v / sum : 1 / 3,
          sum > 0 ? w / sum : 1 / 3,
        );
        nextX = values.x;
        nextY = values.y;
        nextZ = values.z ?? nextZ;
      }
      this.writeValues(nextX, nextY, nextZ);
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

    this.writeValues(nextX, nextY);
  }

  /** Maps a point on the element onto channel values through its barycentric weights. */
  private valuesFromPoint(
    normalizedX: number,
    normalizedY: number,
  ): { x: number; y: number; z?: number } {
    const [v0, v1, v2] = this.positionVertices();
    const clamped = clampToTriangle(normalizedX, normalizedY, v0, v1, v2);
    const { u, v, w } = barycentricCoords(clamped.x, clamped.y, v0, v1, v2);
    const cu = Math.max(0, u);
    const cv = Math.max(0, v);
    const cw = Math.max(0, w);
    const sum = cu + cv + cw || 1;
    const nu = cu / sum;
    const nv = cv / sum;
    const nw = cw / sum;

    if (this.isThreeChannel()) {
      // v0 → (xMax, yMin, zMin), v1 → (xMin, yMax, zMin), v2 → (xMin, yMin, zMax)
      return {
        x: nu * this.maxX() + (1 - nu) * this.minX(),
        y: nv * this.maxY() + (1 - nv) * this.minY(),
        z: nw * this.maxZ() + (1 - nw) * this.minZ(),
      };
    }
    // v0 → (xMax, yMax), v1 → (xMin, yMax), v2 → (xMin, yMin)
    return {
      x: nu * this.maxX() + nv * this.minX() + nw * this.minX(),
      y: nu * this.maxY() + nv * this.maxY() + nw * this.minY(),
    };
  }

  /** The axes a key drives, or `undefined` when the key is not ours. */
  private partialFromKey(event: KeyboardEvent): { x?: number; y?: number } | undefined {
    if (this.isDisabled()) return undefined;

    if (event.key === "Home") return { x: this.minX(), y: this.minY() };
    if (event.key === "End") return { x: this.maxX(), y: this.maxY() };
    if (event.key === "PageUp") return { y: this.valueY() + this.stepY() * PAGE_STEPS };
    if (event.key === "PageDown") return { y: this.valueY() - this.stepY() * PAGE_STEPS };

    const delta = STEP_KEYS[event.key];
    if (!delta) return undefined;

    const offset = delta.sign * stepMultiplier(event);
    return delta.axis === "x"
      ? { x: this.valueX() + this.stepX() * offset }
      : { y: this.valueY() + this.stepY() * offset };
  }

  protected onPointerDown(event: PointerEvent): void {
    this.drag.pointerDown(event);
    // `pointerDown` calls `preventDefault`, which suppresses the focus the
    // browser would have moved to the thumb; do it explicitly instead.
    if (this.drag.isDragging) {
      this.host.nativeElement.querySelector<HTMLElement>("[role='slider']")?.focus();
    }
  }

  protected onPointerMove(event: PointerEvent): void {
    this.drag.pointerMove(event);
  }

  protected onPointerUp(event: PointerEvent): void {
    this.drag.pointerUp(event);
  }

  protected onPointerCancel(): void {
    this.drag.cancel();
    this.draggingState.set(false);
  }

  /**
   * Keyboard lives on the root rather than the thumb: `keydown` from the
   * focused thumb bubbles here, so one listener covers both.
   */
  protected onKeyDown(event: KeyboardEvent): void {
    const partial = this.partialFromKey(event);
    if (!partial) return;
    event.preventDefault();
    this.keyboardActive = true;
    this.setChannelValues(partial);
  }

  protected onKeyUp(): void {
    if (!this.keyboardActive) return;
    this.keyboardActive = false;
    this.valueCommit.emit(this.value());
  }
}

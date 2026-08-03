import {
  afterNextRender,
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
import { Color, type SpaceId } from "@urcolor/core";
import {
  applyDisplayValue,
  cartesianToPolar,
  colorSpaces,
  colorToDisplayValue,
  createDragController,
  DATA_DISABLED,
  DATA_DRAGGING,
  FEEDBACK_EPSILON,
  normalizeAngle,
  PAGE_KEYS,
  resolveArrowKey,
  resolveChannelConfig,
  snapToStep,
  stepMultiplier,
  type DragPoint,
} from "@urcolor/shared";

/** The colour a root falls back to when `[(value)]` is never bound. */
export const COLOR_RING_DEFAULT_COLOR: Color = Color.parse("hsl(0, 100%, 50%)")!;

/**
 * The root of a colour ring: an annular control whose angle maps to one
 * channel. Owns the colour, the interaction, and every piece of state the
 * other parts read through `inject(ColorRingRoot)`.
 *
 * ```html
 * <div urcColorRingRoot [(value)]="color" colorSpace="hsl" channel="h">
 *   <div urcColorRingTrack>
 *     <canvas urcColorRingGradient></canvas>
 *     <span urcColorRingThumb></span>
 *   </div>
 * </div>
 * ```
 *
 * The root must declare `container-type: inline-size` (or `size`) — the thumb
 * orbits in `cqmin` units so it tracks the ring without measuring it.
 *
 * `implements FormValueControl<Color>` is satisfied by the `value` model alone,
 * which is what makes `<div urcColorRingRoot [field]="form.brandColor">` work.
 */
@Directive({
  selector: "[urcColorRingRoot]",
  exportAs: "urcColorRingRoot",
  host: {
    [`[attr.${DATA_DISABLED}]`]: "isDisabled() ? '' : null",
    [`[attr.${DATA_DRAGGING}]`]: "dragging() ? '' : null",
    "[attr.aria-disabled]": "isDisabled() ? 'true' : null",
    "(pointerdown)": "onPointerDown($event)",
    "(pointermove)": "onPointerMove($event)",
    "(pointerup)": "onPointerUp($event)",
    "(pointercancel)": "onPointerCancel()",
    "(keydown)": "onKeyDown($event)",
    "(keyup)": "onKeyUp()",
  },
})
export class ColorRingRoot implements FormValueControl<Color> {
  /** The colour, two-way bindable as `[(value)]`. Also the Signal Forms contract. */
  readonly value = model<Color>(COLOR_RING_DEFAULT_COLOR);
  /** Emitted once at the end of an interaction, never mid-drag. */
  readonly valueCommit = output<Color>();

  /** The colour space the ring operates in. */
  readonly colorSpace = input<SpaceId>("hsl");
  /** The channel the angle maps to. Defaults to the space's first channel. */
  readonly channel = input<string>();
  /** Degrees clockwise from 12 o'clock at which the channel's minimum sits. */
  readonly startAngle = input(0, { transform: numberAttribute });
  /** Hole radius as a ratio of the outer radius, 0-1. Drives hit testing and the thumb's orbit. */
  readonly innerRadius = input(0.7, { transform: numberAttribute });

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

  /** The channel actually in use, with the space's first channel as the fallback. */
  readonly channelKey = computed(
    () => this.channel() ?? colorSpaces[this.colorSpace()]?.channels[0]?.key ?? "h",
  );

  private readonly channelConfig = computed(() =>
    resolveChannelConfig(this.colorSpace(), this.channelKey()),
  );

  /**
   * The channel's display-space bounds and increment. Named `channelMin` /
   * `channelMax` rather than `min` / `max` because `FormUiControl` reserves
   * both for `InputSignal<number | undefined>` validation inputs.
   */
  readonly channelMin = computed(() => this.channelConfig()?.min ?? 0);
  /** The channel's display-space upper bound. A full turn defaults to 360. */
  readonly channelMax = computed(() => this.channelConfig()?.max ?? 360);
  /** The channel's display-space increment. */
  readonly channelStep = computed(() => this.channelConfig()?.step ?? 1);

  /** The channel expressed in display units. */
  readonly displayValue = computed(() =>
    colorToDisplayValue(this.value(), this.colorSpace(), this.channelKey()),
  );

  /** Hue-like channels wrap at their bounds; every other channel clamps. */
  private readonly cyclic = computed(() => this.channelConfig()?.format === "degree");

  /** True while a key that changes the value is held down. */
  private keyboardActive = false;

  private readonly drag = createDragController({
    getElement: () => this.host.nativeElement,
    isDisabled: () => this.isDisabled(),
    hitTest: point => this.insideAnnulus(point),
    onStart: () => this.draggingState.set(true),
    onMove: point => this.setDisplayValue(this.valueFromPoint(point)),
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
      if (typeof MutationObserver === "undefined") return;
      const observer = new MutationObserver(() => this.syncDomState(element));
      observer.observe(element, { attributes: true, attributeFilter: ["disabled"] });
      this.destroyRef.onDestroy(() => observer.disconnect());
    });

    this.destroyRef.onDestroy(() => this.drag.cancel());
  }

  /** Writes one display-space channel value back as a colour. */
  private setDisplayValue(next: number): void {
    if (!this.channelConfig()) return;
    const snapped = snapToStep(next, this.channelMin(), this.channelMax(), this.channelStep());
    if (Math.abs(snapped - this.displayValue()) < FEEDBACK_EPSILON) return;
    this.value.set(applyDisplayValue(this.value(), this.colorSpace(), this.channelKey(), snapped));
  }

  private syncDomState(element: HTMLElement): void {
    this.disabledState.set(element.hasAttribute("disabled"));
  }

  /** The angle from the ring's centre to the pointer, mapped onto the channel range. */
  private valueFromPoint(point: DragPoint): number {
    const { rect } = point;
    const { angle } = cartesianToPolar(
      point.clientX,
      point.clientY,
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    const min = this.channelMin();
    return min + (normalizeAngle(angle, this.startAngle()) / 360) * (this.channelMax() - min);
  }

  /** Rejects a pointerdown landing in the hole or outside the ring. */
  private insideAnnulus(point: DragPoint): boolean {
    const { rect } = point;
    const outerR = Math.min(rect.width, rect.height) / 2;
    const innerR = outerR * this.innerRadius();
    const dx = point.clientX - (rect.left + rect.width / 2);
    const dy = point.clientY - (rect.top + rect.height / 2);
    const distSq = dx * dx + dy * dy;
    return distSq <= outerR * outerR && distSq >= innerR * innerR;
  }

  /**
   * The ring's keyboard step. It is not `valueFromKey` from the primitives
   * because that clamps at the bounds, and an angular control has none: a hue
   * ring must carry `359 + 1` round to `0`.
   */
  private valueFromRingKey(event: KeyboardEvent): number | undefined {
    if (this.isDisabled()) return undefined;
    const min = this.channelMin();
    const max = this.channelMax();
    if (event.key === "Home") return min;
    if (event.key === "End") return max;

    const step = this.channelStep();
    let offset: number;
    if (PAGE_KEYS.some(key => key === event.key)) {
      offset = step * 10 * (event.key === "PageUp" ? 1 : -1);
    } else {
      const arrow = resolveArrowKey({ key: event.key });
      if (!arrow) return undefined;
      // Both axes drive the single angular value; only the sign matters.
      offset = step * stepMultiplier(event) * arrow.sign;
    }

    const next = this.displayValue() + offset;
    const range = max - min;
    if (!this.cyclic() || range === 0) return Math.min(max, Math.max(min, next));
    return ((((next - min) % range) + range) % range) + min;
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
    const next = this.valueFromRingKey(event);
    if (next === undefined) return;
    event.preventDefault();
    this.keyboardActive = true;
    this.setDisplayValue(next);
  }

  protected onKeyUp(): void {
    if (!this.keyboardActive) return;
    this.keyboardActive = false;
    this.valueCommit.emit(this.value());
  }
}

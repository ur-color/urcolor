import { Color, type SpaceId } from "@urcolor/core";
import {
  applyDisplayValues,
  colorSpaces,
  colorToDisplayValue,
  createDragController,
  DATA_DISABLED,
  DATA_DRAGGING,
  FEEDBACK_EPSILON,
  parseColor,
  resolveChannelConfig,
  snapToStep,
  stepMultiplier,
  type DragController,
} from "@urcolor/shared";
import { define } from "../../base/define";
import { RootHostMixin } from "../../base/RootHost";
import { UrcolorPart } from "../../base/UrcolorPart";

const DEFAULT_COLOR = Color.parse("hsl(0, 100%, 50%)")!;

/**
 * `ArrowDown` increases the vertical channel because the y display axis runs
 * downward whenever the area slides from the top; `boundary` re-mirrors it
 * when it does not.
 */
const STEP_KEYS: Record<string, { axis: "x" | "y"; sign: 1 | -1 }> = {
  ArrowRight: { axis: "x", sign: 1 },
  ArrowLeft: { axis: "x", sign: -1 },
  ArrowDown: { axis: "y", sign: 1 },
  ArrowUp: { axis: "y", sign: -1 },
};

/**
 * The two-dimensional color area's root.
 *
 * Unlike the slider there is no separate control part, so this element is both
 * the state holder and the measured, interactive surface.
 */
export class UrcolorAreaRoot extends RootHostMixin(UrcolorPart) {
  static override properties = {
    value: {},
    colorSpace: { type: String, attribute: "color-space" },
    xChannel: { type: String, attribute: "x-channel" },
    yChannel: { type: String, attribute: "y-channel" },
    disabled: { type: Boolean },
    xInverted: { type: Boolean, attribute: "x-inverted" },
    yInverted: { type: Boolean, attribute: "y-inverted" },
    thumbAlignment: { type: String, attribute: "thumb-alignment" },
  };

  declare value: Color | string | null;
  declare colorSpace: SpaceId;
  declare xChannel: string | undefined;
  declare yChannel: string | undefined;
  declare disabled: boolean;
  declare xInverted: boolean;
  declare yInverted: boolean;
  declare thumbAlignment: "contain" | "overflow";

  #internal: Color = DEFAULT_COLOR;
  #dragging = false;
  #drag: DragController | null = null;
  #keyboardActive = false;

  constructor() {
    super();
    this.value = null;
    this.colorSpace = "hsl";
    this.disabled = false;
    this.xInverted = false;
    this.yInverted = false;
    this.thumbAlignment = "overflow";
  }

  get color(): Color {
    return parseColor(this.value) ?? this.#internal;
  }

  get dragging(): boolean {
    return this.#dragging;
  }

  get xChannelKey(): string {
    return this.xChannel ?? colorSpaces[this.colorSpace]?.channels[0]?.key ?? "h";
  }

  get yChannelKey(): string {
    return this.yChannel ?? colorSpaces[this.colorSpace]?.channels[1]?.key ?? "s";
  }

  get minX(): number { return resolveChannelConfig(this.colorSpace, this.xChannelKey)?.min ?? 0; }
  get maxX(): number { return resolveChannelConfig(this.colorSpace, this.xChannelKey)?.max ?? 100; }
  get minY(): number { return resolveChannelConfig(this.colorSpace, this.yChannelKey)?.min ?? 0; }
  get maxY(): number { return resolveChannelConfig(this.colorSpace, this.yChannelKey)?.max ?? 100; }

  get #stepX(): number { return resolveChannelConfig(this.colorSpace, this.xChannelKey)?.step ?? 1; }
  get #stepY(): number { return resolveChannelConfig(this.colorSpace, this.yChannelKey)?.step ?? 1; }

  /** RTL and `xInverted` each mirror the horizontal axis, so together they cancel. */
  get isSlidingFromLeft(): boolean {
    const rtl = this.dir === "rtl";
    return (!rtl && !this.xInverted) || (rtl && this.xInverted);
  }

  /** Reading direction never affects the vertical axis. */
  get isSlidingFromTop(): boolean {
    return !this.yInverted;
  }

  get valueX(): number {
    return colorToDisplayValue(this.color, this.colorSpace, this.xChannelKey);
  }

  get valueY(): number {
    return colorToDisplayValue(this.color, this.colorSpace, this.yChannelKey);
  }

  /** Writes both display-space channel values back as a single color. */
  setDisplayValues(nextXRaw: number, nextYRaw: number): void {
    const nextX = snapToStep(nextXRaw, this.minX, this.maxX, this.#stepX);
    const nextY = snapToStep(nextYRaw, this.minY, this.maxY, this.#stepY);
    if (Math.abs(nextX - this.valueX) < FEEDBACK_EPSILON
      && Math.abs(nextY - this.valueY) < FEEDBACK_EPSILON) return;

    const nextColor = applyDisplayValues(
      this.color,
      this.colorSpace,
      [this.xChannelKey, this.yChannelKey],
      [nextX, nextY],
    );
    this.#internal = nextColor;
    if (this.value !== null && this.value !== undefined) this.value = nextColor;
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent("colorchange", {
      detail: { color: nextColor },
      bubbles: true,
      composed: true,
    }));
  }

  commit(): void {
    this.dispatchEvent(new CustomEvent("colorcommit", {
      detail: { color: this.color },
      bubbles: true,
      composed: true,
    }));
  }

  /** Maps a 0-1 axis position to a display value, honouring the axis direction. */
  #valueFromNormalized(position: number, min: number, max: number, forward: boolean): number {
    const ratio = forward ? position : 1 - position;
    return min + ratio * (max - min);
  }

  /**
   * `Home`/`End` and `PageUp`/`PageDown` address the *visual* edges, so a
   * mirrored axis swaps which bound each of them means.
   */
  #boundary(axis: "x" | "y", bound: number): number {
    if (axis === "x") {
      if (this.isSlidingFromLeft) return bound;
      return bound === this.minX ? this.maxX : this.minX;
    }
    if (this.isSlidingFromTop) return bound;
    return bound === this.minY ? this.maxY : this.minY;
  }

  /** The display-space point a key would move to, or undefined if it is not ours. */
  #pointFromKey(event: KeyboardEvent): [number, number] | undefined {
    if (this.disabled) return undefined;

    if (event.key === "Home") return [this.#boundary("x", this.minX), this.valueY];
    if (event.key === "End") return [this.#boundary("x", this.maxX), this.valueY];
    if (event.key === "PageUp") return [this.valueX, this.#boundary("y", this.minY)];
    if (event.key === "PageDown") return [this.valueX, this.#boundary("y", this.maxY)];

    const delta = STEP_KEYS[event.key];
    if (!delta) return undefined;

    const axisIsX = delta.axis === "x";
    const forward = axisIsX ? this.isSlidingFromLeft : this.isSlidingFromTop;
    const step = axisIsX ? this.#stepX : this.#stepY;
    const offset = step * stepMultiplier(event) * delta.sign * (forward ? 1 : -1);
    return axisIsX ? [this.valueX + offset, this.valueY] : [this.valueX, this.valueY + offset];
  }

  override connectedCallback(): void {
    super.connectedCallback();

    this.#drag = createDragController({
      getElement: () => this,
      isDisabled: () => this.disabled,
      onStart: () => {
        this.#dragging = true;
        this.requestUpdate();
      },
      onMove: (point) => {
        this.setDisplayValues(
          this.#valueFromNormalized(point.normalizedX, this.minX, this.maxX, this.isSlidingFromLeft),
          this.#valueFromNormalized(point.normalizedY, this.minY, this.maxY, this.isSlidingFromTop),
        );
      },
      onEnd: () => {
        this.#dragging = false;
        this.requestUpdate();
        this.commit();
      },
    });

    this.addEventListener("pointerdown", this.#onPointerDown);
    this.addEventListener("pointermove", this.#onPointerMove);
    this.addEventListener("pointerup", this.#onPointerUp);
    this.addEventListener("pointercancel", this.#onPointerCancel);
    this.addEventListener("keydown", this.#onKeyDown);
    this.addEventListener("keyup", this.#onKeyUp);
  }

  override disconnectedCallback(): void {
    this.removeEventListener("pointerdown", this.#onPointerDown);
    this.removeEventListener("pointermove", this.#onPointerMove);
    this.removeEventListener("pointerup", this.#onPointerUp);
    this.removeEventListener("pointercancel", this.#onPointerCancel);
    this.removeEventListener("keydown", this.#onKeyDown);
    this.removeEventListener("keyup", this.#onKeyUp);
    this.#drag?.cancel();
    this.#drag = null;
    super.disconnectedCallback();
  }

  #onPointerDown = (event: Event): void => {
    this.#drag?.pointerDown(event as PointerEvent);
    // `pointerDown` calls `preventDefault`, which suppresses the focus the
    // browser would have moved to the thumb; do it explicitly instead.
    if (this.#drag?.isDragging) this.querySelector<HTMLElement>("[role='slider']")?.focus();
  };

  #onPointerMove = (event: Event): void => {
    this.#drag?.pointerMove(event as PointerEvent);
  };

  #onPointerUp = (event: Event): void => {
    this.#drag?.pointerUp(event as PointerEvent);
  };

  #onPointerCancel = (): void => {
    this.#drag?.pointerCancel();
    this.#dragging = false;
    this.requestUpdate();
  };

  #onKeyDown = (event: Event): void => {
    const keyEvent = event as KeyboardEvent;
    const next = this.#pointFromKey(keyEvent);
    if (!next) return;
    keyEvent.preventDefault();
    this.#keyboardActive = true;
    this.setDisplayValues(next[0], next[1]);
  };

  #onKeyUp = (): void => {
    if (!this.#keyboardActive) return;
    this.#keyboardActive = false;
    this.commit();
  };

  protected override update(changed: Map<string, unknown>): void {
    this.toggleAttribute(DATA_DISABLED, this.disabled);
    this.toggleAttribute(DATA_DRAGGING, this.#dragging);
    super.update(changed);
  }
}

define("urcolor-area-root", UrcolorAreaRoot);

declare global {
  interface HTMLElementTagNameMap {
    "urcolor-area-root": UrcolorAreaRoot;
  }
}

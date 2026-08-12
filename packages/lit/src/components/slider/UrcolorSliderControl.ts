import {
  createDragController,
  DATA_DISABLED,
  DATA_ORIENTATION,
  valueFromKey,
  valueFromPosition,
  type DragController,
} from "@urcolor/shared";
import { define } from "../../base/define";
import { UrcolorPart } from "../../base/UrcolorPart";
import type { UrcolorSliderRoot } from "./UrcolorSliderRoot";

/**
 * The measured, interactive area of the slider.
 *
 * Every listener the family needs lives here: pointer capture converts a
 * position to a value against this element's box, and `keydown` from the
 * focused thumb bubbles up to it, so one host covers both input paths.
 */
export class UrcolorSliderControl extends UrcolorPart {
  #drag: DragController | null = null;
  #keyboardActive = false;

  get #root(): UrcolorSliderRoot {
    return this.rootElement as UrcolorSliderRoot;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.bindRoot("urcolor-slider-root");

    this.#drag = createDragController({
      getElement: () => this,
      isDisabled: () => this.#root.disabled,
      onStart: () => {
        this.#root.dragging = true;
      },
      onMove: (point) => {
        const root = this.#root;
        const state = root.sliderState;
        const position = state.orientation === "vertical" ? point.normalizedY : point.normalizedX;
        root.setDisplayValue(valueFromPosition(state, position));
      },
      onEnd: () => {
        this.#root.dragging = false;
        this.#root.commit();
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
    this.#root.dragging = false;
  };

  #onKeyDown = (event: Event): void => {
    const keyEvent = event as KeyboardEvent;
    const root = this.#root;
    const next = valueFromKey(root.sliderState, keyEvent);
    if (next === undefined) return;
    keyEvent.preventDefault();
    this.#keyboardActive = true;
    root.setDisplayValue(next);
  };

  #onKeyUp = (): void => {
    if (!this.#keyboardActive) return;
    this.#keyboardActive = false;
    this.#root.commit();
  };

  protected override update(changed: Map<string, unknown>): void {
    const root = this.#root;
    this.setAttribute(DATA_ORIENTATION, root.orientation);
    this.toggleAttribute(DATA_DISABLED, root.disabled);
    super.update(changed);
  }
}

define("urcolor-slider-control", UrcolorSliderControl);

declare global {
  interface HTMLElementTagNameMap {
    "urcolor-slider-control": UrcolorSliderControl;
  }
}

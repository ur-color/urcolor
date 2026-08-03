import {
  computed,
  DestroyRef,
  Directive,
  HostAttributeToken,
  inject,
  signal,
} from "@angular/core";
import { DATA_DISABLED, DATA_PRESSED } from "@urcolor/shared";
import { ColorFieldRoot } from "../root/color-field-root";

/** Delay before a held button starts repeating, then the repeat interval. */
const HOLD_DELAY = 400;
const REPEAT_INTERVAL = 60;

/**
 * Steps the field down, applied to a native `<button>`.
 *
 * Holding the button repeats: one step immediately, then a step every
 * `REPEAT_INTERVAL` ms after an initial `HOLD_DELAY` pause. The release
 * listeners live on `window` so a pointer that leaves the button before lifting
 * still ends the hold.
 */
@Directive({
  selector: "button[urcColorFieldDecrement]",
  exportAs: "urcColorFieldDecrement",
  host: {
    "[attr.type]": "'button'",
    "[attr.tabindex]": "'-1'",
    "[attr.aria-label]": "label",
    "[disabled]": "isDisabled()",
    [`[attr.${DATA_PRESSED}]`]: "pressed() ? '' : null",
    [`[attr.${DATA_DISABLED}]`]: "isDisabled() ? '' : null",
    "(pointerdown)": "onPointerDown($event)",
    "(contextmenu)": "onContextMenu($event)",
  },
})
export class ColorFieldDecrement {
  private readonly root = inject(ColorFieldRoot);
  private readonly destroyRef = inject(DestroyRef);

  /** A consumer's own `aria-label` wins; "Decrease" is only a fallback. */
  protected readonly label
    = inject(new HostAttributeToken("aria-label"), { optional: true }) ?? "Decrease";

  private readonly pressedState = signal(false);

  /** True while the button is held down. */
  protected readonly pressed = this.pressedState.asReadonly();

  /** The input owns the field's tab stop; the steppers are pointer affordances. */
  protected readonly isDisabled = computed(
    () => this.root.isDisabled() || this.root.isReadOnly() || this.root.isDecreaseDisabled(),
  );

  /** Plain, non-reactive: only the hold loop reads it. */
  private timeout: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.destroyRef.onDestroy(() => this.stop());
  }

  protected onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || this.isDisabled()) return;
    event.preventDefault();
    this.pressedState.set(true);
    this.startPress(HOLD_DELAY);
    if (typeof window === "undefined") return;
    window.addEventListener("pointerup", this.stop);
    window.addEventListener("pointercancel", this.stop);
  }

  protected onContextMenu(event: Event): void {
    event.preventDefault();
  }

  /** Steps once, then schedules itself so a held button keeps stepping. */
  private startPress(delay: number): void {
    if (this.timeout !== undefined) clearTimeout(this.timeout);
    if (this.isDisabled()) return;
    this.root.handleDecrease();
    this.timeout = setTimeout(() => this.startPress(REPEAT_INTERVAL), delay);
  }

  /** An arrow property so it detaches by identity from the `window` listeners. */
  private readonly stop = (): void => {
    this.pressedState.set(false);
    if (this.timeout !== undefined) clearTimeout(this.timeout);
    this.timeout = undefined;
    if (typeof window === "undefined") return;
    window.removeEventListener("pointerup", this.stop);
    window.removeEventListener("pointercancel", this.stop);
  };
}

import { computed, signal, type Signal, type WritableSignal } from "@angular/core";
import { Color } from "@urcolor/core";
import { parseColor } from "@urcolor/shared";

/** Anything accepted as the initial colour of a store. */
export type ColorInput = Color | string | null | undefined;

/** The colour a store falls back to when the input is missing or unparseable. */
export const COLOR_STORE_FALLBACK: Color = Color.parse("hsl(0, 0%, 0%)")!;

/**
 * Signal-backed colour state.
 *
 * `color` is the single source of truth and is writable, so `set()` and
 * `update()` come from Angular itself — there is no `setColor` method. `hex`
 * and `alpha` are projections of it: read them as signals, write them through
 * `setHex` / `setAlpha`.
 */
export interface ColorStore {
  /** The current colour. Write with `color.set(...)` or `color.update(...)`. */
  readonly color: WritableSignal<Color>;
  /** The current colour as a hex string. */
  readonly hex: Signal<string>;
  /** Parses `next` and replaces the colour when it is valid; ignores it otherwise. */
  setHex(next: string): void;
  /** The current alpha as a percentage in `0..100`. */
  readonly alpha: Signal<number>;
  /** Sets the alpha from a percentage in `0..100`. */
  setAlpha(next: number): void;
}

/**
 * Creates signal-backed colour state — the Angular counterpart of React's
 * `useColor`.
 *
 * `input` seeds the initial value only. Like the Svelte port and unlike React,
 * there is no resync effect: the caller owns the input and can push a new
 * colour with `store.color.set(...)`, which keeps an in-flight edit from being
 * overwritten.
 *
 * Nothing here touches the DOM or the injector, so it may be called from a
 * field initializer, a constructor, a service, or plain module scope.
 *
 * ```ts
 * export class Picker {
 *   protected readonly swatch = createColorStore("oklch(70% 0.15 250)");
 *   protected onReset(): void {
 *     this.swatch.color.set(Color.parse("hsl(0, 0%, 0%)")!);
 *   }
 * }
 * ```
 */
export function createColorStore(input?: ColorInput): ColorStore {
  const color = signal<Color>(parseColor(input) ?? COLOR_STORE_FALLBACK);
  const hex = computed(() => color().toString("hex"));
  const alpha = computed(() => Math.round(color().alpha * 100));

  return {
    color,
    hex,
    setHex(next: string): void {
      const parsed = Color.parse(next);
      if (parsed) color.set(parsed);
    },
    alpha,
    setAlpha(next: number): void {
      color.update(prev => prev.withAlpha(next / 100));
    },
  };
}

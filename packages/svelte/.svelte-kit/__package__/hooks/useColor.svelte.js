import { Color } from "@urcolor/core";
import { parseColor } from "@urcolor/primitives";
const FALLBACK = Color.parse("hsl(0, 0%, 0%)");
/**
 * Reactive colour state.
 *
 * `input` seeds the initial value only. Unlike React's `useColor`, there is no
 * resync effect: the caller owns the input and can call `setColor` to push a new
 * one, which keeps an in-flight edit from being overwritten.
 */
export function useColor(input) {
    let color = $state(parseColor(input) ?? FALLBACK);
    const hex = $derived(color.toString("hex"));
    const alpha = $derived(Math.round(color.alpha * 100));
    return {
        get color() {
            return color;
        },
        setColor(next) {
            color = typeof next === "function" ? next(color) : next;
        },
        get hex() {
            return hex;
        },
        setHex(next) {
            const parsed = Color.parse(next);
            if (parsed)
                color = parsed;
        },
        get alpha() {
            return alpha;
        },
        setAlpha(next) {
            color = color.withAlpha(next / 100);
        },
    };
}

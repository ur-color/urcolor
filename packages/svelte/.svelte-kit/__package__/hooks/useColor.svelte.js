import { Color } from "@urcolor/core";
import { channelsOf, parseColor } from "@urcolor/shared";
const FALLBACK = Color.parse("hsl(0, 0%, 0%)");
/**
 * Reactive colour state.
 *
 * `input` seeds the initial value only. Unlike React's `useColor`, there is no
 * resync effect: the caller owns the input and can call `setColor` to push a new
 * one, which keeps an in-flight edit from being overwritten.
 *
 * `space` decides what `channels` describes. Left out, it follows the colour's
 * own space, which is what a single-space editor wants. A picker that mixes
 * spaces should pass one: writing through a control converts the colour into
 * that control's space, so an HSV area would otherwise renumber a set of HSL
 * fields under the user mid-drag.
 */
export function useColor(input, space) {
    let color = $state(parseColor(input) ?? FALLBACK);
    const hex = $derived(color.toString("hex"));
    const alpha = $derived(Math.round(color.alpha * 100));
    const channels = $derived(channelsOf(space ?? color.space));
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
        get channels() {
            return channels;
        },
    };
}

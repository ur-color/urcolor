import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { ChildSnippetArgs } from "../../../shared/child.js";
export interface ColorRingGradientProps extends HTMLAttributes<HTMLSpanElement> {
    /**
     * Lock channels to fixed values in the gradient.
     * - `{ alpha: 1 }` (default) — lock alpha to 1
     * - `false` — no overrides
     */
    channelOverrides?: Record<string, number> | false;
    /**
     * Replaces the default `<canvas>`; receives its props, including the paint
     * attachment. The checkerboard-and-mask wrapper is always rendered by this part.
     */
    child?: Snippet<[ChildSnippetArgs]>;
}
declare const ColorRingGradient: import("svelte").Component<ColorRingGradientProps, {}, "">;
type ColorRingGradient = ReturnType<typeof ColorRingGradient>;
export default ColorRingGradient;

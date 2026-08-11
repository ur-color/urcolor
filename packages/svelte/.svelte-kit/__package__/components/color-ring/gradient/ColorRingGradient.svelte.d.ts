import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { GradientRenderer } from "@urcolor/shared";
import type { ChildSnippetArgs } from "../../../shared/child.js";
export interface ColorRingGradientProps extends HTMLAttributes<HTMLSpanElement> {
    /**
     * Lock channels to fixed values in the gradient.
     * - `{ alpha: 1 }` (default) — lock alpha to 1
     * - `false` — no overrides
     */
    channelOverrides?: Record<string, number> | false;
    /**
     * Which painter to use.
     * - `"auto"` (default) — CSS when an exact recipe exists, canvas otherwise
     * - `"css"` — force CSS; falls back to the canvas with a dev warning if none exists
     * - `"canvas"` — force the canvas painter
     */
    renderer?: GradientRenderer;
    /**
     * Replaces the default `<canvas>`; receives its props, including the paint
     * attachment. The checkerboard-and-mask wrapper is always rendered by this part.
     */
    child?: Snippet<[ChildSnippetArgs]>;
}
declare const ColorRingGradient: import("svelte").Component<ColorRingGradientProps, {}, "">;
type ColorRingGradient = ReturnType<typeof ColorRingGradient>;
export default ColorRingGradient;

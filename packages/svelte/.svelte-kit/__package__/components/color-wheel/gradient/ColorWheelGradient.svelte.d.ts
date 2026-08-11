import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { GradientRenderer } from "@urcolor/shared";
import type { ChildSnippetArgs } from "../../../shared/child.js";
export interface ColorWheelGradientProps extends HTMLAttributes<HTMLSpanElement> {
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
     * attachment. The checkerboard wrapper is always rendered by this part.
     */
    child?: Snippet<[ChildSnippetArgs]>;
}
declare const ColorWheelGradient: import("svelte").Component<ColorWheelGradientProps, {}, "">;
type ColorWheelGradient = ReturnType<typeof ColorWheelGradient>;
export default ColorWheelGradient;

import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { GradientRenderer } from "@urcolor/shared";
import type { ChildSnippetArgs } from "../../../shared/child.js";
export interface ColorTriangleGradientProps extends HTMLAttributes<HTMLSpanElement> {
    /**
     * Lock channels to fixed values in the gradient.
     * - `{ alpha: 1 }` (default) — lock alpha to 1
     * - `false` — no overrides
     */
    channelOverrides?: Record<string, number> | false;
    /**
     * Which painter to use. A barycentric sweep has no CSS equivalent, so this
     * component always paints into a canvas — the prop exists for symmetry with
     * the other gradients, and `"css"` warns and falls back.
     */
    renderer?: GradientRenderer;
    /**
     * Replaces the default `<canvas>`; receives its props, including the paint
     * attachment. The checkerboard wrapper is always rendered by this part.
     */
    child?: Snippet<[ChildSnippetArgs]>;
}
declare const ColorTriangleGradient: import("svelte").Component<ColorTriangleGradientProps, {}, "">;
type ColorTriangleGradient = ReturnType<typeof ColorTriangleGradient>;
export default ColorTriangleGradient;

import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { SpaceId } from "@urcolor/core";
import type { ChildSnippetArgs } from "../../../shared/child.js";
export interface ColorAreaGradientProps extends HTMLAttributes<HTMLSpanElement> {
    /** Explicit top-left corner colour. Supplying any corner switches to corner mode. */
    topLeft?: string;
    /** Explicit top-right corner colour. */
    topRight?: string;
    /** Explicit bottom-left corner colour. */
    bottomLeft?: string;
    /** Explicit bottom-right corner colour. */
    bottomRight?: string;
    /** Interpolate the surface in this space for perceptual accuracy. */
    interpolationSpace?: SpaceId;
    /**
     * Lock channels to fixed values in the gradient.
     * - `{ alpha: 1 }` (default) — lock alpha to 1
     * - `false` — no overrides
     */
    channelOverrides?: Record<string, number> | false;
    /**
     * Replaces the default `<canvas>`; receives its props, including the paint
     * attachment. The checkerboard wrapper is always rendered by this part.
     */
    child?: Snippet<[ChildSnippetArgs]>;
}
declare const ColorAreaGradient: import("svelte").Component<ColorAreaGradientProps, {}, "">;
type ColorAreaGradient = ReturnType<typeof ColorAreaGradient>;
export default ColorAreaGradient;

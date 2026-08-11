import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { SpaceId } from "@urcolor/core";
import type { GradientRenderer } from "@urcolor/shared";
import type { ChildSnippetArgs } from "../../../shared/child.js";
export interface ColorSliderGradientProps extends HTMLAttributes<HTMLSpanElement> {
    /** Explicit colour stops. When omitted, they are computed from the channel and the current colour. */
    colors?: string[];
    /** Rotation in degrees. Defaults to 90 for a vertical slider, 0 otherwise. */
    angle?: number;
    /** Interpolate the stops in this space for perceptual accuracy. */
    interpolationSpace?: SpaceId;
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
declare const ColorSliderGradient: import("svelte").Component<ColorSliderGradientProps, {}, "">;
type ColorSliderGradient = ReturnType<typeof ColorSliderGradient>;
export default ColorSliderGradient;

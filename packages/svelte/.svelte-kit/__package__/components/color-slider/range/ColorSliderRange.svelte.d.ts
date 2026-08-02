import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { ChildSnippetArgs } from "../../../shared/child.js";
export interface ColorSliderRangeProps extends HTMLAttributes<HTMLDivElement> {
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
}
declare const ColorSliderRange: import("svelte").Component<ColorSliderRangeProps, {}, "">;
type ColorSliderRange = ReturnType<typeof ColorSliderRange>;
export default ColorSliderRange;

import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { ChildSnippetArgs } from "../../../shared/child.js";
export interface ColorWheelThumbProps extends HTMLAttributes<HTMLSpanElement> {
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
}
declare const ColorWheelThumb: import("svelte").Component<ColorWheelThumbProps, {}, "">;
type ColorWheelThumb = ReturnType<typeof ColorWheelThumb>;
export default ColorWheelThumb;

import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { ChildSnippetArgs } from "../../../shared/child.js";
export interface ColorRingThumbProps extends HTMLAttributes<HTMLSpanElement> {
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
}
declare const ColorRingThumb: import("svelte").Component<ColorRingThumbProps, {}, "">;
type ColorRingThumb = ReturnType<typeof ColorRingThumb>;
export default ColorRingThumb;

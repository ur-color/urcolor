import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { ChildSnippetArgs } from "../../../shared/child.js";
export interface ColorAreaThumbProps extends HTMLAttributes<HTMLSpanElement> {
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
}
declare const ColorAreaThumb: import("svelte").Component<ColorAreaThumbProps, {}, "">;
type ColorAreaThumb = ReturnType<typeof ColorAreaThumb>;
export default ColorAreaThumb;

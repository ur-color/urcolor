import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { ChildSnippetArgs } from "../../../shared/child.js";
export interface ColorTriangleThumbProps extends HTMLAttributes<HTMLSpanElement> {
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
}
declare const ColorTriangleThumb: import("svelte").Component<ColorTriangleThumbProps, {}, "">;
type ColorTriangleThumb = ReturnType<typeof ColorTriangleThumb>;
export default ColorTriangleThumb;

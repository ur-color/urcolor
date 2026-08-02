import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { ChildSnippetArgs } from "../../../shared/child.js";
export interface ColorSliderThumbProps extends HTMLAttributes<HTMLDivElement> {
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
}
declare const ColorSliderThumb: import("svelte").Component<ColorSliderThumbProps, {}, "">;
type ColorSliderThumb = ReturnType<typeof ColorSliderThumb>;
export default ColorSliderThumb;

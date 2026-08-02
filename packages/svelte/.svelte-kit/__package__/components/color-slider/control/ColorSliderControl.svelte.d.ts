import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { ChildSnippetArgs } from "../../../shared/child.js";
export interface ColorSliderControlProps extends HTMLAttributes<HTMLDivElement> {
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
}
declare const ColorSliderControl: import("svelte").Component<ColorSliderControlProps, {}, "">;
type ColorSliderControl = ReturnType<typeof ColorSliderControl>;
export default ColorSliderControl;

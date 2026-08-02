import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { ChildSnippetArgs } from "../../../shared/child.js";
export interface ColorSliderTrackProps extends HTMLAttributes<HTMLDivElement> {
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
}
declare const ColorSliderTrack: import("svelte").Component<ColorSliderTrackProps, {}, "">;
type ColorSliderTrack = ReturnType<typeof ColorSliderTrack>;
export default ColorSliderTrack;

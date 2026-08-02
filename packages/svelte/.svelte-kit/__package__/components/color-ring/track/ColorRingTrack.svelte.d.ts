import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { ChildSnippetArgs } from "../../../shared/child.js";
export interface ColorRingTrackProps extends HTMLAttributes<HTMLDivElement> {
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
}
declare const ColorRingTrack: import("svelte").Component<ColorRingTrackProps, {}, "">;
type ColorRingTrack = ReturnType<typeof ColorRingTrack>;
export default ColorRingTrack;

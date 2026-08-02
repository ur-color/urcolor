import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { Color, SpaceId } from "@urcolor/core";
import type { ChildSnippetArgs } from "../../../shared/child.js";
export interface ColorRingRootProps extends HTMLAttributes<HTMLDivElement> {
    /** The colour value. Bindable: `bind:value`. */
    value?: Color | string | null;
    /** The colour used until the first interaction when `value` is not bound. */
    defaultValue?: Color | string | null;
    /** The colour space mode (e.g. `"hsl"`, `"oklch"`). */
    colorSpace?: SpaceId;
    /** Which channel the ring's angle maps to. Defaults to the space's first channel. */
    channel?: string;
    /** When true, prevents the user from interacting with the ring. */
    disabled?: boolean;
    /** Degrees clockwise from 12 o'clock at which the channel's minimum sits. */
    startAngle?: number;
    /** Hole radius as a ratio of the outer radius (0-1). Drives hit testing and the thumb's orbit. */
    innerRadius?: number;
    /** Called on every change, including mid-drag. */
    onValueChange?: (color: Color) => void;
    /** Called once at the end of an interaction. */
    onValueCommit?: (color: Color) => void;
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
}
declare const ColorRingRoot: import("svelte").Component<ColorRingRootProps, {}, "value">;
type ColorRingRoot = ReturnType<typeof ColorRingRoot>;
export default ColorRingRoot;

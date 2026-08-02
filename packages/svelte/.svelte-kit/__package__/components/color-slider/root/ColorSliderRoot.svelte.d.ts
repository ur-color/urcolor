import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { Color, SpaceId } from "@urcolor/core";
import type { ChildSnippetArgs } from "../../../shared/child.js";
export interface ColorSliderRootProps extends HTMLAttributes<HTMLDivElement> {
    /** The colour value. Bindable: `bind:value`. */
    value?: Color | string | null;
    /** The colour used until the first interaction when `value` is not bound. */
    defaultValue?: Color | string | null;
    /** The colour space mode (e.g. `"hsl"`, `"oklch"`). */
    colorSpace?: SpaceId;
    /** Which channel this slider controls (e.g. `"h"`, `"s"`, `"l"`, `"alpha"`). */
    channel?: string;
    /** When true, prevents the user from interacting with the slider. */
    disabled?: boolean;
    /** The reading direction. */
    dir?: "ltr" | "rtl";
    /** Whether the slider runs opposite to its natural direction. */
    inverted?: boolean;
    /** The orientation of the slider. */
    orientation?: "horizontal" | "vertical";
    /** Called on every change, including mid-drag. */
    onValueChange?: (color: Color) => void;
    /** Called once at the end of an interaction. */
    onValueCommit?: (color: Color) => void;
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
}
declare const ColorSliderRoot: import("svelte").Component<ColorSliderRootProps, {}, "value">;
type ColorSliderRoot = ReturnType<typeof ColorSliderRoot>;
export default ColorSliderRoot;

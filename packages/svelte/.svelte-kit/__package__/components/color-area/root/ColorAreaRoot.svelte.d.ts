import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { Color, SpaceId } from "@urcolor/core";
import type { ChildSnippetArgs } from "../../../shared/child.js";
export interface ColorAreaRootProps extends HTMLAttributes<HTMLDivElement> {
    /** The colour value. Bindable: `bind:value`. */
    value?: Color | string | null;
    /** The colour used until the first interaction when `value` is not bound. */
    defaultValue?: Color | string | null;
    /** The colour space mode (e.g. `"hsl"`, `"oklch"`). */
    colorSpace?: SpaceId;
    /** Which channel maps to the horizontal axis. Defaults to the space's first channel. */
    xChannel?: string;
    /** Which channel maps to the vertical axis. Defaults to the space's second channel. */
    yChannel?: string;
    /** When true, prevents the user from interacting with the area. */
    disabled?: boolean;
    /** The reading direction. */
    dir?: "ltr" | "rtl";
    /** Whether the horizontal axis runs opposite to its natural direction. */
    xInverted?: boolean;
    /** Whether the vertical axis runs opposite to its natural direction. */
    yInverted?: boolean;
    /** Whether the thumb is centred on the edge (`"overflow"`) or kept inside it. */
    thumbAlignment?: "contain" | "overflow";
    /** Called on every change, including mid-drag. */
    onValueChange?: (color: Color) => void;
    /** Called once at the end of an interaction. */
    onValueCommit?: (color: Color) => void;
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
}
declare const ColorAreaRoot: import("svelte").Component<ColorAreaRootProps, {}, "value">;
type ColorAreaRoot = ReturnType<typeof ColorAreaRoot>;
export default ColorAreaRoot;

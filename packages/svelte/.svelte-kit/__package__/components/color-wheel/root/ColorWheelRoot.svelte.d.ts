import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { Color, SpaceId } from "@urcolor/core";
import type { ChildSnippetArgs } from "../../../shared/child.js";
export interface ColorWheelRootProps extends HTMLAttributes<HTMLDivElement> {
    /** The colour value. Bindable: `bind:value`. */
    value?: Color | string | null;
    /** The colour used until the first interaction when `value` is not bound. */
    defaultValue?: Color | string | null;
    /** The colour space mode (e.g. `"hsl"`, `"oklch"`). */
    colorSpace?: SpaceId;
    /** Channel driven by the angular axis. Defaults to the space's first channel. */
    angleChannel?: string;
    /** Channel driven by the radial axis. Defaults to the space's second channel. */
    radiusChannel?: string;
    /** Degrees of rotation for the angular axis; 0 puts its origin at 12 o'clock. */
    startAngle?: number;
    /** When true, prevents the user from interacting with the wheel. */
    disabled?: boolean;
    /** Called on every change, including mid-drag. */
    onValueChange?: (color: Color) => void;
    /** Called once at the end of an interaction. */
    onValueCommit?: (color: Color) => void;
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
}
declare const ColorWheelRoot: import("svelte").Component<ColorWheelRootProps, {}, "value">;
type ColorWheelRoot = ReturnType<typeof ColorWheelRoot>;
export default ColorWheelRoot;

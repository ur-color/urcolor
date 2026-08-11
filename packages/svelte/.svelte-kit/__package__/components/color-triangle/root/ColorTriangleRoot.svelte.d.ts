import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { Color, SpaceId } from "@urcolor/core";
import type { ChildSnippetArgs } from "../../../shared/child.js";
export interface ColorTriangleRootProps extends HTMLAttributes<HTMLDivElement> {
    /** The colour value. Bindable: `bind:value`. */
    value?: Color | string | null;
    /** The colour used until the first interaction when `value` is not bound. */
    defaultValue?: Color | string | null;
    /** The colour space mode (e.g. `"hsv"`, `"oklch"`). */
    colorSpace?: SpaceId;
    /** The channel mapped to the first vertex. Defaults to the space's second channel. */
    xChannel?: string;
    /** The channel mapped to the second vertex. Defaults to the space's third channel. */
    yChannel?: string;
    /** The channel mapped to the third vertex. Supplying it switches the triangle to a three-channel simplex. */
    zChannel?: string;
    /** Rotation of the triangle, in degrees. */
    /** Swaps the second and third vertices, mirroring the triangle. */
    inverted?: boolean;
    /** Whether the thumb is centred on the edge (`"overflow"`) or kept inside it. */
    thumbAlignment?: "contain" | "overflow";
    /** When true, prevents the user from interacting with the triangle. */
    disabled?: boolean;
    /** Called on every change, including mid-drag. */
    onValueChange?: (color: Color) => void;
    /** Called once at the end of an interaction. */
    onValueCommit?: (color: Color) => void;
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
}
declare const ColorTriangleRoot: import("svelte").Component<ColorTriangleRootProps, {}, "value">;
type ColorTriangleRoot = ReturnType<typeof ColorTriangleRoot>;
export default ColorTriangleRoot;

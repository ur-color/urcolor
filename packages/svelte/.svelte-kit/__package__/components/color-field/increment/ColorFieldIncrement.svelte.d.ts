import type { Snippet } from "svelte";
import type { HTMLButtonAttributes } from "svelte/elements";
import type { ChildSnippetArgs } from "../../../shared/child.js";
export interface ColorFieldIncrementProps extends HTMLButtonAttributes {
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
}
declare const ColorFieldIncrement: import("svelte").Component<ColorFieldIncrementProps, {}, "">;
type ColorFieldIncrement = ReturnType<typeof ColorFieldIncrement>;
export default ColorFieldIncrement;

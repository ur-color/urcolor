import type { Snippet } from "svelte";
import type { HTMLButtonAttributes } from "svelte/elements";
import type { ChildSnippetArgs } from "../../../shared/child.js";
export interface ColorFieldDecrementProps extends HTMLButtonAttributes {
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
}
declare const ColorFieldDecrement: import("svelte").Component<ColorFieldDecrementProps, {}, "">;
type ColorFieldDecrement = ReturnType<typeof ColorFieldDecrement>;
export default ColorFieldDecrement;

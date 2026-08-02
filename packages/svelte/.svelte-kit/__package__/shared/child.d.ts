/**
 * The props object handed to a `child` snippet. Parts spread this onto their
 * default element when no `child` snippet is supplied. Attachment entries live
 * under `Symbol` keys so they survive spreading.
 */
export type ChildProps = Record<string, unknown>;
/** Argument shape of a `child` snippet: `{@render child({ props })}`. */
export interface ChildSnippetArgs {
    props: ChildProps;
}

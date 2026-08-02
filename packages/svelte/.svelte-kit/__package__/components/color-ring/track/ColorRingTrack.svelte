<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { ChildSnippetArgs } from "../../../shared/child.js";

  export interface ColorRingTrackProps extends HTMLAttributes<HTMLDivElement> {
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
  }
</script>

<script lang="ts">
  import { DATA_DISABLED, DATA_DRAGGING } from "@urcolor/primitives";
  import type { ChildProps } from "../../../shared/child.js";
  import { colorRingContext } from "../root/context.svelte.js";

  let { class: className, style, children, child, ...rest }: ColorRingTrackProps = $props();

  const context = colorRingContext.get();

  const elementProps = $derived<ChildProps>({
    ...rest,
    "class": className,
    "style": style,
    [DATA_DISABLED]: context.disabled ? "" : undefined,
    [DATA_DRAGGING]: context.dragging ? "" : undefined,
  });
</script>

{#if child}
  {@render child({ props: elementProps })}
{:else}
  <div {...elementProps}>{@render children?.()}</div>
{/if}

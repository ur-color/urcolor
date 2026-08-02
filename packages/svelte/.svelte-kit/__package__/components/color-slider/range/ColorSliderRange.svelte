<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { ChildSnippetArgs } from "../../../shared/child.js";

  export interface ColorSliderRangeProps extends HTMLAttributes<HTMLDivElement> {
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
  }
</script>

<script lang="ts">
  import { clamp, DATA_DISABLED, DATA_ORIENTATION, positionFromValue } from "@urcolor/primitives";
  import type { ChildProps } from "../../../shared/child.js";
  import { colorSliderContext } from "../root/context.svelte.js";

  let { class: className, style, children, child, ...rest }: ColorSliderRangeProps = $props();

  const context = colorSliderContext.get();

  const state = $derived(context.sliderState);
  /** Filled share of the track, measured from the minimum end. */
  const fraction = $derived(
    state.max === state.min ? 0 : clamp((state.value - state.min) / (state.max - state.min), 0, 1),
  );
  /**
   * Whether the minimum sits at the track's CSS start edge. Asking the
   * primitive where `min` renders keeps `dir`, `inverted` and vertical flipping
   * in one place instead of re-deriving them here.
   */
  const fillsFromStart = $derived(positionFromValue({ ...state, value: state.min }) === 0);
  const layout = $derived(
    state.orientation === "vertical"
      ? `position:absolute;left:0;right:0;height:${fraction * 100}%;${fillsFromStart ? "top:0" : "bottom:0"};`
      : `position:absolute;top:0;bottom:0;width:${fraction * 100}%;${fillsFromStart ? "left:0" : "right:0"};`,
  );

  const elementProps = $derived<ChildProps>({
    ...rest,
    "class": className,
    // The caller's declarations come last so they win the cascade.
    "style": style ? `${layout}${style}` : layout,
    [DATA_ORIENTATION]: state.orientation,
    [DATA_DISABLED]: state.disabled ? "" : undefined,
  });
</script>

{#if child}
  {@render child({ props: elementProps })}
{:else}
  <div {...elementProps}>{@render children?.()}</div>
{/if}

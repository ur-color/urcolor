<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { ChildSnippetArgs } from "../../../shared/child.js";

  export interface ColorSliderThumbProps extends HTMLAttributes<HTMLDivElement> {
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
  }
</script>

<script lang="ts">
  import {
    channelLabel,
    DATA_DISABLED,
    DATA_DRAGGING,
    DATA_ORIENTATION,
    formatChannelValue,
    sliderAria,
  } from "@urcolor/shared";
  import type { ChildProps } from "../../../shared/child.js";
  import { colorSliderContext } from "../root/context.svelte.js";

  let { class: className, style, children, child, ...rest }: ColorSliderThumbProps = $props();

  const context = colorSliderContext.get();

  const state = $derived(context.sliderState);
  const aria = $derived(sliderAria(state));
  const label = $derived(channelLabel(context.colorSpace, context.channel));
  const valueText = $derived(formatChannelValue(context.colorSpace, context.channel, state.value));
  const offset = $derived(context.position * 100);
  const layout = $derived(
    state.orientation === "vertical"
      ? `position:absolute;top:${offset}%;left:50%;translate:-50% -50%;`
      : `position:absolute;left:${offset}%;top:50%;translate:-50% -50%;`,
  );

  const elementProps = $derived<ChildProps>({
    ...rest,
    ...aria,
    // The thumb is only focusable; `keydown` bubbles to the root's attachment,
    // which owns every value change.
    "aria-label": rest["aria-label"] ?? label,
    "aria-valuetext": valueText,
    "class": className,
    // The caller's declarations come last so they win the cascade.
    "style": style ? `${layout}${style}` : layout,
    [DATA_ORIENTATION]: state.orientation,
    [DATA_DISABLED]: state.disabled ? "" : undefined,
    [DATA_DRAGGING]: context.dragging ? "" : undefined,
  });
</script>

{#if child}
  {@render child({ props: elementProps })}
{:else}
  <div {...elementProps}>{@render children?.()}</div>
{/if}

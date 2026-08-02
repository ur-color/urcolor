<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { ChildSnippetArgs } from "../../../shared/child.js";

  export interface ColorAreaThumbProps extends HTMLAttributes<HTMLSpanElement> {
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
  }
</script>

<script lang="ts">
  import {
    channelLabel,
    convertValueToPercentage,
    DATA_DISABLED,
    DATA_DRAGGING,
    formatChannelValue,
  } from "@urcolor/primitives";
  import type { ChildProps } from "../../../shared/child.js";
  import { colorAreaContext } from "../root/context.svelte.js";

  let { class: className, style, children, child, ...rest }: ColorAreaThumbProps = $props();

  const context = colorAreaContext.get();

  const percentX = $derived(convertValueToPercentage(context.valueX, context.minX, context.maxX));
  const percentY = $derived(convertValueToPercentage(context.valueY, context.minY, context.maxY));

  const label = $derived(
    `${channelLabel(context.colorSpace, context.xChannel)} and ${channelLabel(context.colorSpace, context.yChannel)}`,
  );
  const valueText = $derived(
    `${formatChannelValue(context.colorSpace, context.xChannel, context.valueX)}, `
    + `${formatChannelValue(context.colorSpace, context.yChannel, context.valueY)}`,
  );

  /**
   * A mirrored axis is anchored from the opposite edge so the percentage stays
   * positive. The transform comes from the root, which knows the alignment.
   */
  const layout = $derived(
    "position:absolute;transform:var(--reka-slider-area-thumb-transform);"
    + `${context.isSlidingFromLeft ? "left" : "right"}:${percentX}%;`
    + `${context.isSlidingFromTop ? "top" : "bottom"}:${percentY}%;`,
  );

  const elementProps = $derived<ChildProps>({
    ...rest,
    // The thumb is only focusable; `keydown` bubbles to the root's attachment,
    // which owns every value change.
    "role": "slider",
    "tabindex": context.disabled ? undefined : 0,
    "aria-roledescription": "2D slider",
    "aria-valuenow": context.valueX,
    "aria-valuemin": context.minX,
    "aria-valuemax": context.maxX,
    "aria-valuetext": valueText,
    "aria-label": rest["aria-label"] ?? label,
    "aria-disabled": context.disabled ? true : undefined,
    "class": className,
    // The caller's declarations come last so they win the cascade.
    "style": style ? `${layout}${style}` : layout,
    [DATA_DISABLED]: context.disabled ? "" : undefined,
    [DATA_DRAGGING]: context.dragging ? "" : undefined,
  });
</script>

{#if child}
  {@render child({ props: elementProps })}
{:else}
  <span {...elementProps}>{@render children?.()}</span>
{/if}

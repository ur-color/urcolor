<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { ChildSnippetArgs } from "../../../shared/child.js";

  export interface ColorRingThumbProps extends HTMLAttributes<HTMLSpanElement> {
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
  }
</script>

<script lang="ts">
  import { channelLabel, DATA_DISABLED, DATA_DRAGGING, formatChannelValue } from "@urcolor/primitives";
  import type { ChildProps } from "../../../shared/child.js";
  import { colorRingContext } from "../root/context.svelte.js";

  let { class: className, style, children, child, ...rest }: ColorRingThumbProps = $props();

  const context = colorRingContext.get();

  const angle = $derived.by(() => {
    const range = context.max - context.min;
    if (range === 0) return context.startAngle;
    return ((context.value - context.min) / range) * 360 + context.startAngle;
  });

  /**
   * Half the annulus width from the centre, in `cqmin` — the ring's own
   * container query unit, so the orbit tracks the root's size without measuring
   * it. The root must therefore declare `container-type: size` or `inline-size`.
   */
  const orbit = $derived(((1 + context.innerRadius) / 2) * 50);
  const layout = $derived(
    "position:absolute;top:50%;left:50%;"
    + `transform:rotate(${angle}deg) translateY(-${orbit}cqmin) translate(-50%, -50%);`
    + "transform-origin:0 0;",
  );

  const label = $derived(channelLabel(context.colorSpace, context.channel));
  const valueText = $derived(formatChannelValue(context.colorSpace, context.channel, context.value));

  const elementProps = $derived<ChildProps>({
    ...rest,
    // The thumb is only focusable; `keydown` bubbles to the root's attachment,
    // which owns every value change. There is no `aria-orientation`: a ring is
    // neither horizontal nor vertical.
    "role": "slider",
    "tabindex": context.disabled ? undefined : 0,
    "aria-valuenow": context.value,
    "aria-valuemin": context.min,
    "aria-valuemax": context.max,
    "aria-label": rest["aria-label"] ?? label,
    "aria-valuetext": valueText,
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

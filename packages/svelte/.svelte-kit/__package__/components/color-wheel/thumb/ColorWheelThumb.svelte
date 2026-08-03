<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { ChildSnippetArgs } from "../../../shared/child.js";

  export interface ColorWheelThumbProps extends HTMLAttributes<HTMLSpanElement> {
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
  }
</script>

<script lang="ts">
  import {
    channelLabel,
    DATA_DISABLED,
    DATA_DRAGGING,
    formatChannelValue,
  } from "@urcolor/shared";
  import type { ChildProps } from "../../../shared/child.js";
  import { colorWheelContext } from "../root/context.svelte.js";

  let { class: className, style, children, child, ...rest }: ColorWheelThumbProps = $props();

  const context = colorWheelContext.get();

  /** Position on the wheel, in degrees clockwise from 12 o'clock. */
  const angleDeg = $derived.by(() => {
    const range = context.angleMax - context.angleMin;
    if (range === 0) return context.startAngle;
    return ((context.angleValue - context.angleMin) / range) * 360 + context.startAngle;
  });

  /**
   * Distance from the centre, as a percentage of the container's smaller side.
   * The wheel's radius is half that side, hence the 50 rather than 100.
   */
  const radiusPercent = $derived.by(() => {
    const range = context.radiusMax - context.radiusMin;
    if (range === 0) return 0;
    return ((context.radiusValue - context.radiusMin) / range) * 50;
  });

  const angleLabel = $derived(channelLabel(context.colorSpace, context.angleChannel));
  const radiusLabel = $derived(channelLabel(context.colorSpace, context.radiusChannel));

  // A single thumb drives two channels, so it announces both. `aria-valuenow`
  // can only carry one; the angular axis owns it and `aria-valuetext` carries
  // the pair.
  const ariaLabel = $derived(`${angleLabel}, ${radiusLabel}`);
  const ariaValueText = $derived.by(() => {
    const angle = formatChannelValue(context.colorSpace, context.angleChannel, context.angleValue);
    const radius = formatChannelValue(context.colorSpace, context.radiusChannel, context.radiusValue);
    return `${angleLabel} ${angle}, ${radiusLabel} ${radius}`;
  });

  const layout = $derived(
    "position:absolute;top:50%;left:50%;transform-origin:0 0;"
    + `transform:rotate(${angleDeg}deg) translateY(-${radiusPercent}cqmin) translate(-50%, -50%);`,
  );

  const elementProps = $derived<ChildProps>({
    ...rest,
    // The thumb is only focusable; `keydown` bubbles to the root's attachment,
    // which owns every value change.
    "role": "slider",
    "tabindex": context.disabled ? undefined : 0,
    "aria-label": rest["aria-label"] ?? ariaLabel,
    "aria-valuenow": context.angleValue,
    "aria-valuemin": context.angleMin,
    "aria-valuemax": context.angleMax,
    "aria-valuetext": ariaValueText,
    "aria-roledescription": "Color thumb",
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

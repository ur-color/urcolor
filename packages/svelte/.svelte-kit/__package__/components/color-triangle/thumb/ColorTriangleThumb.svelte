<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { ChildSnippetArgs } from "../../../shared/child.js";

  export interface ColorTriangleThumbProps extends HTMLAttributes<HTMLSpanElement> {
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
  }
</script>

<script lang="ts">
  import { createAttachmentKey } from "svelte/attachments";
  import { barycentricFromChannels, barycentricToCartesian, channelLabel, DATA_DISABLED, DATA_DRAGGING, formatChannelValue } from "@urcolor/shared";
  import type { ChildProps } from "../../../shared/child.js";
  import { colorTriangleContext } from "../root/context.svelte.js";

  let { class: className, style, children, child, ...rest }: ColorTriangleThumbProps = $props();

  const context = colorTriangleContext.get();

  /** Channel values back to barycentric weights. See `barycentricFromChannels`. */
  const bary = $derived(barycentricFromChannels(
    { value: context.valueX, min: context.minX, max: context.maxX },
    { value: context.valueY, min: context.minY, max: context.maxY },
    context.isThreeChannel ? { value: context.valueZ, min: context.minZ, max: context.maxZ } : undefined,
  ));

  const position = $derived.by(() => {
    const [v0, v1, v2] = context.positionVertices;
    return barycentricToCartesian(bary.u, bary.v, bary.w, v0, v1, v2);
  });

  /** The third entry is present only in three-channel mode. */
  const labels = $derived.by(() => ({
    x: channelLabel(context.colorSpace, context.xChannelKey),
    y: channelLabel(context.colorSpace, context.yChannelKey),
    z:
      context.isThreeChannel && context.zChannelKey !== undefined
        ? channelLabel(context.colorSpace, context.zChannelKey)
        : undefined,
  }));

  const label = $derived([labels.x, labels.y, labels.z].filter(entry => entry !== undefined).join(", "));

  const valueText = $derived.by(() => {
    const parts = [
      `${labels.x} ${formatChannelValue(context.colorSpace, context.xChannelKey, context.valueX)}`,
      `${labels.y} ${formatChannelValue(context.colorSpace, context.yChannelKey, context.valueY)}`,
    ];
    if (labels.z !== undefined && context.zChannelKey !== undefined) {
      parts.push(`${labels.z} ${formatChannelValue(context.colorSpace, context.zChannelKey, context.valueZ)}`);
    }
    return parts.join(", ");
  });

  const layout = $derived(
    `position:absolute;left:${position.x * 100}%;top:${position.y * 100}%;translate:-50% -50%;`,
  );

  const attachmentKey = createAttachmentKey();

  /**
   * Hands this element to the root, which measures it for the `"contain"`
   * inset. Declared once so the attachment keeps a stable identity.
   */
  function register(node: HTMLElement): () => void {
    return context.registerThumb(node);
  }

  const elementProps = $derived<ChildProps>({
    ...rest,
    // The thumb is only focusable; `keydown` bubbles to the root's attachment,
    // which owns every value change.
    "role": "slider",
    "tabindex": context.disabled ? undefined : 0,
    "aria-roledescription": "Color thumb",
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
    [attachmentKey]: register,
  });
</script>

{#if child}
  {@render child({ props: elementProps })}
{:else}
  <span {...elementProps}>{@render children?.()}</span>
{/if}

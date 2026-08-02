<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { Color, SpaceId } from "@urcolor/core";
  import type { ChildSnippetArgs } from "../../../shared/child.js";

  export interface ColorRingRootProps extends HTMLAttributes<HTMLDivElement> {
    /** The colour value. Bindable: `bind:value`. */
    value?: Color | string | null;
    /** The colour used until the first interaction when `value` is not bound. */
    defaultValue?: Color | string | null;
    /** The colour space mode (e.g. `"hsl"`, `"oklch"`). */
    colorSpace?: SpaceId;
    /** Which channel the ring's angle maps to. Defaults to the space's first channel. */
    channel?: string;
    /** When true, prevents the user from interacting with the ring. */
    disabled?: boolean;
    /** Degrees clockwise from 12 o'clock at which the channel's minimum sits. */
    startAngle?: number;
    /** Hole radius as a ratio of the outer radius (0-1). Drives hit testing and the thumb's orbit. */
    innerRadius?: number;
    /** Called on every change, including mid-drag. */
    onValueChange?: (color: Color) => void;
    /** Called once at the end of an interaction. */
    onValueCommit?: (color: Color) => void;
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
  }
</script>

<script lang="ts">
  import { untrack } from "svelte";
  import { createAttachmentKey } from "svelte/attachments";
  import { Color as ColorClass, cartesianToPolar, colorSpaces, normalizeAngle } from "@urcolor/core";
  import {
    applyDisplayValue,
    colorToDisplayValue,
    createDragController,
    DATA_DISABLED,
    DATA_DRAGGING,
    FEEDBACK_EPSILON,
    PAGE_KEYS,
    parseColor,
    resolveArrowKey,
    resolveChannelConfig,
    snapToStep,
    stepMultiplier,
    type DragPoint,
  } from "@urcolor/primitives";
  import type { ChildProps } from "../../../shared/child.js";
  import { colorRingContext } from "./context.svelte.js";

  const DEFAULT_COLOR = ColorClass.parse("hsl(0, 100%, 50%)")!;

  let {
    value = $bindable(),
    defaultValue,
    colorSpace = "hsl",
    channel,
    disabled = false,
    startAngle = 0,
    innerRadius = 0.7,
    onValueChange,
    onValueCommit,
    class: className,
    style,
    children,
    child,
    ...rest
  }: ColorRingRootProps = $props();

  /**
   * Uncontrolled fallback, kept in sync so it and `value` never disagree.
   * `untrack` states the intent that only the initial props are read here.
   */
  let internalColor = $state<Color>(
    untrack(() => parseColor(value) ?? parseColor(defaultValue) ?? DEFAULT_COLOR),
  );
  let dragging = $state(false);
  /** Plain, non-reactive: only the drag controller reads it, and only on pointer events. */
  let element: HTMLElement | null = null;

  const color = $derived(parseColor(value) ?? internalColor);
  const channelKey = $derived(channel ?? colorSpaces[colorSpace]?.channels[0]?.key ?? "h");
  const channelConfig = $derived(resolveChannelConfig(colorSpace, channelKey));
  const min = $derived(channelConfig?.min ?? 0);
  const max = $derived(channelConfig?.max ?? 360);
  const step = $derived(channelConfig?.step ?? 1);
  const displayValue = $derived(colorToDisplayValue(color, colorSpace, channelKey));
  /** Hue-like channels wrap at their bounds; every other channel clamps. */
  const cyclic = $derived(channelConfig?.format === "degree");

  /** Writes one display-space channel value back as a colour. */
  function setDisplayValue(next: number): void {
    if (!channelConfig) return;
    const snapped = snapToStep(next, min, max, step);
    if (Math.abs(snapped - displayValue) < FEEDBACK_EPSILON) return;
    const nextColor = applyDisplayValue(color, colorSpace, channelKey, snapped);
    internalColor = nextColor;
    value = nextColor;
    onValueChange?.(nextColor);
  }

  function commit(): void {
    onValueCommit?.(color);
  }

  /** The angle from the ring's centre to the pointer, mapped onto the channel range. */
  function valueFromPoint(point: DragPoint): number {
    const { rect } = point;
    const { angle } = cartesianToPolar(
      point.clientX,
      point.clientY,
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return min + (normalizeAngle(angle, startAngle) / 360) * (max - min);
  }

  /** Rejects a pointerdown landing in the hole or outside the ring. */
  function insideAnnulus(point: DragPoint): boolean {
    const { rect } = point;
    const outerR = Math.min(rect.width, rect.height) / 2;
    const innerR = outerR * innerRadius;
    const dx = point.clientX - (rect.left + rect.width / 2);
    const dy = point.clientY - (rect.top + rect.height / 2);
    const distSq = dx * dx + dy * dy;
    return distSq <= outerR * outerR && distSq >= innerR * innerR;
  }

  /**
   * The ring's keyboard step. It is not `valueFromKey` from the primitives
   * because that clamps at the bounds, and an angular control has none: a hue
   * ring must carry `359 + 1` round to `0`.
   */
  function valueFromRingKey(event: KeyboardEvent): number | undefined {
    if (disabled) return undefined;
    if (event.key === "Home") return min;
    if (event.key === "End") return max;

    let offset: number;
    if (PAGE_KEYS.some((key) => key === event.key)) {
      offset = step * 10 * (event.key === "PageUp" ? 1 : -1);
    } else {
      const arrow = resolveArrowKey({ key: event.key });
      if (!arrow) return undefined;
      // Both axes drive the single angular value; only the sign matters.
      offset = step * stepMultiplier(event) * arrow.sign;
    }

    const next = displayValue + offset;
    const range = max - min;
    if (!cyclic || range === 0) return Math.min(max, Math.max(min, next));
    return (((next - min) % range) + range) % range + min;
  }

  const drag = createDragController({
    getElement: () => element,
    isDisabled: () => disabled,
    hitTest: insideAnnulus,
    onStart: () => {
      dragging = true;
    },
    onMove: (point) => setDisplayValue(valueFromPoint(point)),
    onEnd: () => {
      dragging = false;
      commit();
    },
  });

  const attachmentKey = createAttachmentKey();

  /**
   * The family's single behaviour attachment: pointer capture, keyboard, and
   * the element the angle is measured against.
   *
   * It travels inside the props object under a `Symbol` key, so a consumer
   * spreading those props onto their own element — or onto another component —
   * gets the full interaction, which an `onpointerdown` prop bag could not do.
   * Keyboard lives here too rather than on the thumb: `keydown` from the
   * focused thumb bubbles to this element, so one attachment covers both.
   */
  function interaction(node: HTMLElement): () => void {
    element = node;
    let keyboardActive = false;

    const onPointerDown = (event: PointerEvent): void => {
      drag.pointerDown(event);
      // `pointerDown` calls `preventDefault`, which suppresses the focus the
      // browser would have moved to the thumb; do it explicitly instead.
      if (drag.isDragging) node.querySelector<HTMLElement>("[role='slider']")?.focus();
    };
    const onPointerMove = (event: PointerEvent): void => drag.pointerMove(event);
    const onPointerUp = (event: PointerEvent): void => drag.pointerUp(event);
    const onPointerCancel = (): void => {
      drag.cancel();
      dragging = false;
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      const next = valueFromRingKey(event);
      if (next === undefined) return;
      event.preventDefault();
      keyboardActive = true;
      setDisplayValue(next);
    };
    const onKeyUp = (): void => {
      if (!keyboardActive) return;
      keyboardActive = false;
      commit();
    };

    node.addEventListener("pointerdown", onPointerDown);
    node.addEventListener("pointermove", onPointerMove);
    node.addEventListener("pointerup", onPointerUp);
    node.addEventListener("pointercancel", onPointerCancel);
    node.addEventListener("keydown", onKeyDown);
    node.addEventListener("keyup", onKeyUp);

    return () => {
      node.removeEventListener("pointerdown", onPointerDown);
      node.removeEventListener("pointermove", onPointerMove);
      node.removeEventListener("pointerup", onPointerUp);
      node.removeEventListener("pointercancel", onPointerCancel);
      node.removeEventListener("keydown", onKeyDown);
      node.removeEventListener("keyup", onKeyUp);
      drag.cancel();
      dragging = false;
      element = null;
    };
  }

  const elementProps = $derived<ChildProps>({
    ...rest,
    "class": className,
    "style": style,
    "aria-disabled": disabled ? true : undefined,
    [DATA_DISABLED]: disabled ? "" : undefined,
    [DATA_DRAGGING]: dragging ? "" : undefined,
    [attachmentKey]: interaction,
  });

  colorRingContext.set({
    get color() {
      return color;
    },
    get colorSpace() {
      return colorSpace;
    },
    get channel() {
      return channelKey;
    },
    get disabled() {
      return disabled;
    },
    get dragging() {
      return dragging;
    },
    get value() {
      return displayValue;
    },
    get min() {
      return min;
    },
    get max() {
      return max;
    },
    get step() {
      return step;
    },
    get startAngle() {
      return startAngle;
    },
    get innerRadius() {
      return innerRadius;
    },
  });
</script>

{#if child}
  {@render child({ props: elementProps })}
{:else}
  <div {...elementProps}>{@render children?.()}</div>
{/if}

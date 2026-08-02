<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { Color, SpaceId } from "@urcolor/core";
  import type { ChildSnippetArgs } from "../../../shared/child.js";

  export interface ColorSliderRootProps extends HTMLAttributes<HTMLDivElement> {
    /** The colour value. Bindable: `bind:value`. */
    value?: Color | string | null;
    /** The colour used until the first interaction when `value` is not bound. */
    defaultValue?: Color | string | null;
    /** The colour space mode (e.g. `"hsl"`, `"oklch"`). */
    colorSpace?: SpaceId;
    /** Which channel this slider controls (e.g. `"h"`, `"s"`, `"l"`, `"alpha"`). */
    channel?: string;
    /** When true, prevents the user from interacting with the slider. */
    disabled?: boolean;
    /** The reading direction. */
    dir?: "ltr" | "rtl";
    /** Whether the slider runs opposite to its natural direction. */
    inverted?: boolean;
    /** The orientation of the slider. */
    orientation?: "horizontal" | "vertical";
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
    import { Color as ColorClass } from "@urcolor/core";
  import {
    applyDisplayValue,
    colorToDisplayValue,
    createDragController,
    DATA_DISABLED,
    DATA_DRAGGING,
    DATA_ORIENTATION,
    FEEDBACK_EPSILON,
    parseColor,
    positionFromValue,
    resolveChannelConfig,
    valueFromKey,
    valueFromPosition,
    type SliderState,
  } from "@urcolor/primitives";
  import type { ChildProps } from "../../../shared/child.js";
  import { colorSliderContext } from "./context.svelte.js";

  const DEFAULT_COLOR = ColorClass.parse("hsl(210, 80%, 50%)")!;

  let {
    value = $bindable(),
    defaultValue,
    colorSpace = "hsl",
    channel = "h",
    disabled = false,
    dir,
    inverted = false,
    orientation = "horizontal",
    onValueChange,
    onValueCommit,
    class: className,
    style,
    children,
    child,
    ...rest
  }: ColorSliderRootProps = $props();

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
  const channelConfig = $derived(resolveChannelConfig(colorSpace, channel));
  const sliderState = $derived<SliderState>({
    value: colorToDisplayValue(color, colorSpace, channel),
    min: channelConfig?.min ?? 0,
    max: channelConfig?.max ?? 100,
    step: channelConfig?.step ?? 1,
    orientation,
    dir: dir ?? "ltr",
    inverted,
    disabled,
  });

  /** Writes one display-space channel value back as a colour. */
  function setDisplayValue(next: number): void {
    if (!channelConfig) return;
    if (Math.abs(next - sliderState.value) < FEEDBACK_EPSILON) return;
    const nextColor = applyDisplayValue(color, colorSpace, channel, next);
    internalColor = nextColor;
    value = nextColor;
    onValueChange?.(nextColor);
  }

  function commit(): void {
    onValueCommit?.(color);
  }

  const drag = createDragController({
    getElement: () => element,
    isDisabled: () => disabled,
    onStart: () => {
      dragging = true;
    },
    onMove: (point) => {
      const position = orientation === "vertical" ? point.normalizedY : point.normalizedX;
      setDisplayValue(valueFromPosition(sliderState, position));
    },
    onEnd: () => {
      dragging = false;
      commit();
    },
  });

  const attachmentKey = createAttachmentKey();

  /**
   * The family's single behaviour attachment: pointer capture, keyboard, and
   * the element that position→value is measured against.
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
      const next = valueFromKey(sliderState, event);
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
    class: className,
    style: style,
    dir: dir,
    [DATA_ORIENTATION]: orientation,
    [DATA_DISABLED]: disabled ? "" : undefined,
    [DATA_DRAGGING]: dragging ? "" : undefined,
    [attachmentKey]: interaction,
  });

  colorSliderContext.set({
    get color() {
      return color;
    },
    get colorSpace() {
      return colorSpace;
    },
    get channel() {
      return channel;
    },
    get orientation() {
      return orientation;
    },
    get inverted() {
      return inverted;
    },
    get disabled() {
      return disabled;
    },
    get dragging() {
      return dragging;
    },
    get sliderState() {
      return sliderState;
    },
    get position() {
      return positionFromValue(sliderState);
    },
  });
</script>

{#if child}
  {@render child({ props: elementProps })}
{:else}
  <div {...elementProps}>{@render children?.()}</div>
{/if}

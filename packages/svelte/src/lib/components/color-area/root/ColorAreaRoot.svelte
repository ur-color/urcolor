<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { Color, SpaceId } from "@urcolor/core";
  import type { ChildSnippetArgs } from "../../../shared/child.js";

  export interface ColorAreaRootProps extends HTMLAttributes<HTMLDivElement> {
    /** The colour value. Bindable: `bind:value`. */
    value?: Color | string | null;
    /** The colour used until the first interaction when `value` is not bound. */
    defaultValue?: Color | string | null;
    /** The colour space mode (e.g. `"hsl"`, `"oklch"`). */
    colorSpace?: SpaceId;
    /** Which channel maps to the horizontal axis. Defaults to the space's first channel. */
    xChannel?: string;
    /** Which channel maps to the vertical axis. Defaults to the space's second channel. */
    yChannel?: string;
    /** When true, prevents the user from interacting with the area. */
    disabled?: boolean;
    /** The reading direction. */
    dir?: "ltr" | "rtl";
    /** Whether the horizontal axis runs opposite to its natural direction. */
    xInverted?: boolean;
    /** Whether the vertical axis runs opposite to its natural direction. */
    yInverted?: boolean;
    /** Whether the thumb is centred on the edge (`"overflow"`) or kept inside it. */
    thumbAlignment?: "contain" | "overflow";
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
    applyDisplayValues,
    colorSpaces,
    colorToDisplayValue,
    createDragController,
    DATA_DISABLED,
    DATA_DRAGGING,
    DATA_SLIDER_AREA_IMPL,
    FEEDBACK_EPSILON,
    parseColor,
    resolveChannelConfig,
    snapToStep,
    stepMultiplier,
  } from "@urcolor/shared";
  import type { ChildProps } from "../../../shared/child.js";
  import { colorAreaContext } from "./context.svelte.js";

  const DEFAULT_COLOR = ColorClass.parse("hsl(0, 100%, 50%)")!;

  /**
   * `ArrowDown` increases the vertical channel because the y display axis runs
   * downward whenever the area slides from the top; `boundary` re-mirrors it
   * when it does not.
   */
  const STEP_KEYS: Record<string, { axis: "x" | "y"; sign: 1 | -1 }> = {
    ArrowRight: { axis: "x", sign: 1 },
    ArrowLeft: { axis: "x", sign: -1 },
    ArrowDown: { axis: "y", sign: 1 },
    ArrowUp: { axis: "y", sign: -1 },
  };

  let {
    value = $bindable(),
    defaultValue,
    colorSpace = "hsl",
    xChannel,
    yChannel,
    disabled = false,
    dir = "ltr",
    xInverted = false,
    yInverted = false,
    thumbAlignment = "overflow",
    onValueChange,
    onValueCommit,
    class: className,
    style,
    children,
    child,
    ...rest
  }: ColorAreaRootProps = $props();

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

  const xChannelKey = $derived(xChannel ?? colorSpaces[colorSpace]?.channels[0]?.key ?? "h");
  const yChannelKey = $derived(yChannel ?? colorSpaces[colorSpace]?.channels[1]?.key ?? "s");
  const xConfig = $derived(resolveChannelConfig(colorSpace, xChannelKey));
  const yConfig = $derived(resolveChannelConfig(colorSpace, yChannelKey));

  const minX = $derived(xConfig?.min ?? 0);
  const maxX = $derived(xConfig?.max ?? 100);
  const minY = $derived(yConfig?.min ?? 0);
  const maxY = $derived(yConfig?.max ?? 100);
  const stepX = $derived(xConfig?.step ?? 1);
  const stepY = $derived(yConfig?.step ?? 1);

  /** RTL and `xInverted` each mirror the horizontal axis, so together they cancel. */
  const isSlidingFromLeft = $derived((dir !== "rtl" && !xInverted) || (dir !== "ltr" && xInverted));
  /** Reading direction never affects the vertical axis. */
  const isSlidingFromTop = $derived(!yInverted);

  const valueX = $derived(colorToDisplayValue(color, colorSpace, xChannelKey));
  const valueY = $derived(colorToDisplayValue(color, colorSpace, yChannelKey));

  /** Writes both display-space channel values back as a single colour. */
  function setDisplayValues(nextXRaw: number, nextYRaw: number): void {
    if (!xConfig || !yConfig) return;
    const nextX = snapToStep(nextXRaw, minX, maxX, stepX);
    const nextY = snapToStep(nextYRaw, minY, maxY, stepY);
    if (Math.abs(nextX - valueX) < FEEDBACK_EPSILON && Math.abs(nextY - valueY) < FEEDBACK_EPSILON) return;
    const nextColor = applyDisplayValues(color, colorSpace, [xChannelKey, yChannelKey], [nextX, nextY]);
    internalColor = nextColor;
    value = nextColor;
    onValueChange?.(nextColor);
  }

  function commit(): void {
    onValueCommit?.(color);
  }

  /** Maps a 0-1 axis position to a display value, honouring the axis direction. */
  function valueFromNormalized(position: number, min: number, max: number, forward: boolean): number {
    const ratio = forward ? position : 1 - position;
    return min + ratio * (max - min);
  }

  /**
   * `Home`/`End` and `PageUp`/`PageDown` address the *visual* edges, so a
   * mirrored axis swaps which bound each of them means.
   */
  function boundary(axis: "x" | "y", bound: number): number {
    if (axis === "x") {
      if (isSlidingFromLeft) return bound;
      return bound === minX ? maxX : minX;
    }
    if (isSlidingFromTop) return bound;
    return bound === minY ? maxY : minY;
  }

  /** The display-space point a key would move to, or undefined if it is not ours. */
  function pointFromKey(event: KeyboardEvent): [number, number] | undefined {
    if (disabled) return undefined;

    if (event.key === "Home") return [boundary("x", minX), valueY];
    if (event.key === "End") return [boundary("x", maxX), valueY];
    if (event.key === "PageUp") return [valueX, boundary("y", minY)];
    if (event.key === "PageDown") return [valueX, boundary("y", maxY)];

    const delta = STEP_KEYS[event.key];
    if (!delta) return undefined;

    const axisIsX = delta.axis === "x";
    const forward = axisIsX ? isSlidingFromLeft : isSlidingFromTop;
    const step = axisIsX ? stepX : stepY;
    const offset = step * stepMultiplier(event) * delta.sign * (forward ? 1 : -1);
    return axisIsX ? [valueX + offset, valueY] : [valueX, valueY + offset];
  }

  const drag = createDragController({
    getElement: () => element,
    isDisabled: () => disabled,
    onStart: () => {
      dragging = true;
    },
    onMove: (point) => {
      setDisplayValues(
        valueFromNormalized(point.normalizedX, minX, maxX, isSlidingFromLeft),
        valueFromNormalized(point.normalizedY, minY, maxY, isSlidingFromTop),
      );
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
      drag.pointerCancel();
      dragging = false;
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      const next = pointFromKey(event);
      if (!next) return;
      event.preventDefault();
      keyboardActive = true;
      setDisplayValues(next[0], next[1]);
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

  /**
   * The thumb centres itself on its edge unless the axis is mirrored and the
   * caller asked for `"contain"`, in which case it is pulled fully inside.
   */
  const layout = $derived(
    "--reka-slider-area-thumb-transform:translate("
    + `${!isSlidingFromLeft && thumbAlignment === "overflow" ? "50%" : "-50%"}, `
    + `${!isSlidingFromTop && thumbAlignment === "overflow" ? "50%" : "-50%"});`,
  );

  const elementProps = $derived<ChildProps>({
    ...rest,
    "aria-disabled": disabled ? true : undefined,
    "class": className,
    "dir": dir,
    // The caller's declarations come last so they win the cascade.
    "style": style ? `${layout}${style}` : layout,
    [DATA_SLIDER_AREA_IMPL]: "",
    [DATA_DISABLED]: disabled ? "" : undefined,
    [DATA_DRAGGING]: dragging ? "" : undefined,
    [attachmentKey]: interaction,
  });

  colorAreaContext.set({
    get color() {
      return color;
    },
    get colorSpace() {
      return colorSpace;
    },
    get xChannelKey() {
      return xChannelKey;
    },
    get yChannelKey() {
      return yChannelKey;
    },
    get minX() {
      return minX;
    },
    get maxX() {
      return maxX;
    },
    get minY() {
      return minY;
    },
    get maxY() {
      return maxY;
    },
    get valueX() {
      return valueX;
    },
    get valueY() {
      return valueY;
    },
    get disabled() {
      return disabled;
    },
    get dragging() {
      return dragging;
    },
    get isSlidingFromLeft() {
      return isSlidingFromLeft;
    },
    get isSlidingFromTop() {
      return isSlidingFromTop;
    },
    get thumbAlignment() {
      return thumbAlignment;
    },
  });
</script>

{#if child}
  {@render child({ props: elementProps })}
{:else}
  <div {...elementProps}>{@render children?.()}</div>
{/if}

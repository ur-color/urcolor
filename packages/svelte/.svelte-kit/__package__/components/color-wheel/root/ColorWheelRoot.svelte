<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { Color, SpaceId } from "@urcolor/core";
  import type { ChildSnippetArgs } from "../../../shared/child.js";

  export interface ColorWheelRootProps extends HTMLAttributes<HTMLDivElement> {
    /** The colour value. Bindable: `bind:value`. */
    value?: Color | string | null;
    /** The colour used until the first interaction when `value` is not bound. */
    defaultValue?: Color | string | null;
    /** The colour space mode (e.g. `"hsl"`, `"oklch"`). */
    colorSpace?: SpaceId;
    /** Channel driven by the angular axis. Defaults to the space's first channel. */
    angleChannel?: string;
    /** Channel driven by the radial axis. Defaults to the space's second channel. */
    radiusChannel?: string;
    /** Degrees of rotation for the angular axis; 0 puts its origin at 12 o'clock. */
    startAngle?: number;
    /** When true, prevents the user from interacting with the wheel. */
    disabled?: boolean;
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
    import {
      cartesianToPolar,
      clampToCircle,
      Color as ColorClass,
      colorSpaces,
      normalizeAngle,
    } from "@urcolor/core";
  import {
    applyDisplayValues,
    clamp,
    colorToDisplayValue,
    createDragController,
    DATA_DISABLED,
    DATA_DRAGGING,
    FEEDBACK_EPSILON,
    parseColor,
    resolveArrowKey,
    resolveChannelConfig,
    snapToStep,
    stepMultiplier,
    type DragPoint,
  } from "@urcolor/shared";
  import type { ChildProps } from "../../../shared/child.js";
  import { colorWheelContext } from "./context.svelte.js";

  const DEFAULT_COLOR = ColorClass.parse("hsl(0, 100%, 50%)")!;
  /** `PageUp`/`PageDown` move the radial axis by ten steps. */
  const PAGE_MULTIPLIER = 10;

  let {
    value = $bindable(),
    defaultValue,
    colorSpace = "hsl",
    angleChannel: angleChannelProp,
    radiusChannel: radiusChannelProp,
    startAngle = 0,
    disabled = false,
    onValueChange,
    onValueCommit,
    class: className,
    style,
    children,
    child,
    ...rest
  }: ColorWheelRootProps = $props();

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

  const spaceConfig = $derived(colorSpaces[colorSpace]);
  const angleChannel = $derived(angleChannelProp ?? spaceConfig?.channels[0]?.key ?? "h");
  const radiusChannel = $derived(radiusChannelProp ?? spaceConfig?.channels[1]?.key ?? "s");

  const angleConfig = $derived(resolveChannelConfig(colorSpace, angleChannel));
  const radiusConfig = $derived(resolveChannelConfig(colorSpace, radiusChannel));

  const angleMin = $derived(angleConfig?.min ?? 0);
  const angleMax = $derived(angleConfig?.max ?? 360);
  const angleStep = $derived(angleConfig?.step ?? 1);
  const radiusMin = $derived(radiusConfig?.min ?? 0);
  const radiusMax = $derived(radiusConfig?.max ?? 100);
  const radiusStep = $derived(radiusConfig?.step ?? 1);

  const angleValue = $derived(colorToDisplayValue(color, colorSpace, angleChannel));
  const radiusValue = $derived(colorToDisplayValue(color, colorSpace, radiusChannel));

  /** Hue-like axes wrap; bounded ones clamp. */
  const angleIsCyclic = $derived(angleConfig?.format === "degree");

  function wrapAngle(next: number): number {
    const range = angleMax - angleMin;
    if (range === 0) return angleMin;
    return (((next - angleMin) % range) + range) % range + angleMin;
  }

  /** Writes both display-space channel values back as a colour. */
  function setDisplayValues(angle: number, radius: number): void {
    if (!angleConfig || !radiusConfig) return;
    const snappedAngle = snapToStep(angle, angleMin, angleMax, angleStep);
    const snappedRadius = snapToStep(radius, radiusMin, radiusMax, radiusStep);
    const changed
      = Math.abs(snappedAngle - angleValue) >= FEEDBACK_EPSILON
        || Math.abs(snappedRadius - radiusValue) >= FEEDBACK_EPSILON;
    if (!changed) return;
    const nextColor = applyDisplayValues(
      color,
      colorSpace,
      [angleChannel, radiusChannel],
      [snappedAngle, snappedRadius],
    );
    internalColor = nextColor;
    value = nextColor;
    onValueChange?.(nextColor);
  }

  function commit(): void {
    onValueCommit?.(color);
  }

  /** Maps a pointer position onto the two display-space axes. */
  function valuesFromPoint(point: DragPoint): { angle: number; radius: number } {
    const { rect } = point;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxRadius = Math.min(rect.width, rect.height) / 2;
    if (maxRadius === 0) return { angle: angleMin, radius: radiusMin };
    const clamped = clampToCircle(point.clientX, point.clientY, cx, cy, maxRadius);
    const polar = cartesianToPolar(clamped.x, clamped.y, cx, cy);
    const normalizedAngle = normalizeAngle(polar.angle, startAngle);
    const normalizedRadius = Math.min(1, polar.radius / maxRadius);
    return {
      angle: angleMin + (normalizedAngle / 360) * (angleMax - angleMin),
      radius: radiusMin + normalizedRadius * (radiusMax - radiusMin),
    };
  }

  const drag = createDragController({
    getElement: () => element,
    isDisabled: () => disabled,
    // The wheel is a disc inside a square box; a press in a corner belongs to
    // whatever is behind the wheel, not to the wheel.
    hitTest: (point) => {
      const { rect } = point;
      const dx = point.clientX - (rect.left + rect.width / 2);
      const dy = point.clientY - (rect.top + rect.height / 2);
      const maxRadius = Math.min(rect.width, rect.height) / 2;
      return dx * dx + dy * dy <= maxRadius * maxRadius;
    },
    onStart: () => {
      dragging = true;
    },
    onMove: (point) => {
      const values = valuesFromPoint(point);
      setDisplayValues(values.angle, values.radius);
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
      if (disabled) return;

      // Home and End jump both axes at once, so they bypass the offset path.
      if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        keyboardActive = true;
        if (event.key === "Home") setDisplayValues(angleMin, radiusMin);
        else setDisplayValues(angleMax, radiusMax);
        return;
      }

      let angleOffset = 0;
      let radiusOffset = 0;
      const arrow = resolveArrowKey({ key: event.key });
      if (arrow) {
        // The horizontal axis drives the angle, the vertical axis the radius.
        const magnitude = stepMultiplier(event) * arrow.sign;
        if (arrow.axis === "x") angleOffset = angleStep * magnitude;
        else radiusOffset = radiusStep * magnitude;
      } else if (event.key === "PageUp") {
        radiusOffset = radiusStep * PAGE_MULTIPLIER;
      } else if (event.key === "PageDown") {
        radiusOffset = -radiusStep * PAGE_MULTIPLIER;
      } else {
        return;
      }

      event.preventDefault();
      keyboardActive = true;
      const rawAngle = angleValue + angleOffset;
      const nextAngle = angleIsCyclic ? wrapAngle(rawAngle) : clamp(rawAngle, angleMin, angleMax);
      const nextRadius = clamp(radiusValue + radiusOffset, radiusMin, radiusMax);
      setDisplayValues(nextAngle, nextRadius);
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
    "aria-disabled": disabled ? true : undefined,
    "class": className,
    "style": style,
    [DATA_DISABLED]: disabled ? "" : undefined,
    [DATA_DRAGGING]: dragging ? "" : undefined,
    [attachmentKey]: interaction,
  });

  colorWheelContext.set({
    get color() {
      return color;
    },
    get colorSpace() {
      return colorSpace;
    },
    get angleChannel() {
      return angleChannel;
    },
    get radiusChannel() {
      return radiusChannel;
    },
    get angleValue() {
      return angleValue;
    },
    get radiusValue() {
      return radiusValue;
    },
    get angleMin() {
      return angleMin;
    },
    get angleMax() {
      return angleMax;
    },
    get radiusMin() {
      return radiusMin;
    },
    get radiusMax() {
      return radiusMax;
    },
    get startAngle() {
      return startAngle;
    },
    get disabled() {
      return disabled;
    },
    get dragging() {
      return dragging;
    },
  });
</script>

{#if child}
  {@render child({ props: elementProps })}
{:else}
  <div {...elementProps}>{@render children?.()}</div>
{/if}

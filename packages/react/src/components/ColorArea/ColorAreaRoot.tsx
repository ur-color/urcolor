import { forwardRef, useCallback, useMemo, useRef, useState } from "react";
import { Color } from "internationalized-color";
import { colorSpaces, getChannelConfig, displayToCulori, culoriToDisplay, type ChannelConfig } from "@urcolor/core";
import { snapToStep, linearScale, getClosestThumbIndex, hasMinStepsBetweenValues, ARROW_KEYS } from "../../utils";
import { ColorAreaContext, type ActiveDirection, type ColorAreaContextValue } from "./ColorAreaContext";

export interface ColorAreaRootProps {
  /** The controlled color value. */
  value?: Color | string | null;
  /** The default color value when uncontrolled. */
  defaultValue?: Color | string;
  /** When true, prevents interaction. */
  disabled?: boolean;
  /** The reading direction. */
  dir?: "ltr" | "rtl";
  /** Whether the X axis is visually inverted. */
  invertedX?: boolean;
  /** Whether the Y axis is visually inverted. */
  invertedY?: boolean;
  /** The color space mode. */
  colorSpace?: string;
  /** Which channel maps to the X axis. */
  channelX?: string;
  /** Which channel maps to the Y axis. */
  channelY?: string;
  /** Thumb alignment. */
  thumbAlignment?: "contain" | "overflow";
  /** Callback fired when the color value changes. */
  onValueChange?: (color: Color) => void;
  /** Callback fired when the value changes at the end of an interaction. */
  onValueCommit?: (color: Color) => void;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

function parseColor(v: Color | string | null | undefined): Color | undefined {
  if (!v) return undefined;
  if (v instanceof Color) return v;
  return Color.parse(v) ?? undefined;
}

const ALPHA_CONFIG: ChannelConfig = { key: "alpha", label: "Alpha", min: 0, max: 100, step: 1, format: "percentage", culoriMin: 0, culoriMax: 1 };

export const ColorAreaRoot = forwardRef<HTMLDivElement, ColorAreaRootProps>(
  function ColorAreaRoot(props, ref) {
    const {
      value: valueProp,
      defaultValue: defaultValueProp = "hsl(0, 100%, 50%)",
      disabled = false,
      dir = "ltr",
      invertedX = false,
      invertedY = false,
      colorSpace = "hsl",
      channelX: channelXProp,
      channelY: channelYProp,
      thumbAlignment = "overflow",
      onValueChange,
      onValueCommit,
      children,
      className,
      style,
    } = props;

    const isControlled = valueProp !== undefined;
    const [internalColor, setInternalColor] = useState<Color | undefined>(
      () => parseColor(valueProp) ?? parseColor(defaultValueProp),
    );

    const prevValueRef = useRef(valueProp);
    if (valueProp !== prevValueRef.current) {
      prevValueRef.current = valueProp;
      const parsed = parseColor(valueProp);
      if (parsed) setInternalColor(parsed);
    }

    const colorRef = isControlled ? (parseColor(valueProp) ?? internalColor) : internalColor;

    const spaceConfig = colorSpaces[colorSpace];
    const xChannelKey = channelXProp ?? spaceConfig?.channels[0]?.key ?? "h";
    const yChannelKey = channelYProp ?? spaceConfig?.channels[1]?.key ?? "s";
    const xIsAlpha = xChannelKey === "alpha";
    const yIsAlpha = yChannelKey === "alpha";
    const xConfig = xIsAlpha ? ALPHA_CONFIG : getChannelConfig(colorSpace, xChannelKey);
    const yConfig = yIsAlpha ? ALPHA_CONFIG : getChannelConfig(colorSpace, yChannelKey);

    const minX = xConfig?.min ?? 0;
    const maxX = xConfig?.max ?? 100;
    const minY = yConfig?.min ?? 0;
    const maxY = yConfig?.max ?? 100;
    const stepX = xConfig?.step ?? 1;
    const stepY = yConfig?.step ?? 1;

    function colorToDisplayValues(color: Color | undefined): number[][] {
      if (!color || !xConfig || !yConfig) return [[minX, minY]];
      const converted = color.to(colorSpace);
      if (!converted) return [[minX, minY]];
      const rawX = xIsAlpha ? (color.alpha ?? 1) : converted.get(xChannelKey, 0);
      const rawY = yIsAlpha ? (color.alpha ?? 1) : converted.get(yChannelKey, 0);
      return [[culoriToDisplay(xConfig, rawX), culoriToDisplay(yConfig, rawY)]];
    }

    const [internalValue, setInternalValue] = useState<number[][]>(() => colorToDisplayValues(colorRef));
    const [valueIndexToChange, setValueIndexToChange] = useState(0);
    const [activeDirection, setActiveDirection] = useState<ActiveDirection>("x");
    const [isDragging, setIsDragging] = useState(false);

    const thumbXElements = useRef<HTMLElement[]>([]);
    const thumbYElements = useRef<HTMLElement[]>([]);
    const elementRef = useRef<HTMLDivElement>(null);
    const rectRef = useRef<DOMRect | undefined>(undefined);
    const offsetPosition = useRef<{ x: number; y: number } | undefined>(undefined);
    const lastPointerPosition = useRef<{ x: number; y: number } | undefined>(undefined);
    const valuesBeforeSlideStart = useRef<number[][]>(internalValue);

    // Sync color -> internal value
    const prevColorRef = useRef(colorRef);
    if (colorRef !== prevColorRef.current) {
      prevColorRef.current = colorRef;
      const newVals = colorToDisplayValues(colorRef);
      const cur = internalValue[0];
      if (!cur || Math.abs((cur[0] ?? 0) - (newVals[0]?.[0] ?? 0)) >= 0.001 || Math.abs((cur[1] ?? 0) - (newVals[0]?.[1] ?? 0)) >= 0.001) {
        setInternalValue(newVals);
      }
    }

    const isSlidingFromLeft = (dir !== "rtl" && !invertedX) || (dir !== "ltr" && invertedX);
    const isSlidingFromTop = !invertedY;

    function displayValuesToColor(vals: number[][]): Color | undefined {
      if (!vals[0] || !colorRef || !xConfig || !yConfig) return undefined;
      const culoriX = displayToCulori(xConfig, vals[0][0] ?? 0);
      const culoriY = displayToCulori(yConfig, vals[0][1] ?? 0);
      const channelUpdates: Record<string, number> = {};
      if (!xIsAlpha) channelUpdates[xChannelKey] = culoriX;
      if (!yIsAlpha) channelUpdates[yChannelKey] = culoriY;
      let result = colorRef.set({ mode: colorSpace, ...channelUpdates });
      if (xIsAlpha) result = result.set({ alpha: culoriX });
      if (yIsAlpha) result = result.set({ alpha: culoriY });
      return result;
    }

    function updateValues(point: number[], atIndex: number, { commit = false } = {}) {
      const nextX = snapToStep(point[0] ?? 0, minX, maxX, stepX);
      const nextY = snapToStep(point[1] ?? 0, minY, maxY, stepY);
      const nextValues = [...internalValue];
      nextValues[atIndex] = [nextX, nextY];

      setValueIndexToChange(atIndex);

      const hasChanged = JSON.stringify(nextValues) !== JSON.stringify(internalValue);
      if (hasChanged) {
        setInternalValue(nextValues);
        const newColor = displayValuesToColor(nextValues);
        if (newColor) {
          if (!isControlled) setInternalColor(newColor);
          onValueChange?.(newColor);
          if (commit) onValueCommit?.(newColor);
        }
      }
    }

    function getPointFromPointerEvent(event: { clientX: number; clientY: number }, slideStart?: boolean): number[] {
      const el = elementRef.current;
      if (!el) return [minX, minY];
      const rect = rectRef.current || el.getBoundingClientRect();
      rectRef.current = rect;

      const inputX: [number, number] = [0, rect.width];
      const outputX: [number, number] = isSlidingFromLeft ? [minX, maxX] : [maxX, minX];
      const scaleX = linearScale(inputX, outputX);

      const inputY: [number, number] = [0, rect.height];
      const outputY: [number, number] = isSlidingFromTop ? [minY, maxY] : [maxY, minY];
      const scaleY = linearScale(inputY, outputY);

      const posX = event.clientX - rect.left;
      const posY = event.clientY - rect.top;
      return [scaleX(posX), scaleY(posY)];
    }

    const handlePointerDown = useCallback((event: React.PointerEvent) => {
      if (disabled) return;
      const target = event.target as HTMLElement;
      target.setPointerCapture(event.pointerId);
      event.preventDefault();

      if (thumbXElements.current.includes(target) || thumbYElements.current.includes(target)) {
        target.focus();
        return;
      }

      valuesBeforeSlideStart.current = [...internalValue];
      setIsDragging(true);
      lastPointerPosition.current = { x: event.clientX, y: event.clientY };
      const point = getPointFromPointerEvent(event, true);
      const closestIndex = getClosestThumbIndex(internalValue, point, minX, maxX, minY, maxY);
      if (closestIndex >= 0) updateValues(point, closestIndex);
    }, [disabled, internalValue, minX, maxX, minY, maxY, isSlidingFromLeft, isSlidingFromTop]);

    const handlePointerMove = useCallback((event: React.PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!target.hasPointerCapture(event.pointerId)) return;
      if (lastPointerPosition.current) {
        const dx = Math.abs(event.clientX - lastPointerPosition.current.x);
        const dy = Math.abs(event.clientY - lastPointerPosition.current.y);
        setActiveDirection(dx >= dy ? "x" : "y");
      }
      lastPointerPosition.current = { x: event.clientX, y: event.clientY };
      const point = getPointFromPointerEvent(event);
      updateValues(point, valueIndexToChange);
    }, [valueIndexToChange, internalValue, minX, maxX, minY, maxY, isSlidingFromLeft, isSlidingFromTop, stepX, stepY]);

    const handlePointerUp = useCallback((event: React.PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!target.hasPointerCapture(event.pointerId)) return;
      target.releasePointerCapture(event.pointerId);
      setIsDragging(false);
      rectRef.current = undefined;
      offsetPosition.current = undefined;
      lastPointerPosition.current = undefined;
      const prevValue = valuesBeforeSlideStart.current[valueIndexToChange];
      const nextValue = internalValue[valueIndexToChange];
      const hasChanged = prevValue?.[0] !== nextValue?.[0] || prevValue?.[1] !== nextValue?.[1];
      if (hasChanged && colorRef) onValueCommit?.(colorRef);
    }, [valueIndexToChange, internalValue, colorRef, onValueCommit]);

    const STEP_KEY_DELTAS: Record<string, { axis: ActiveDirection; sign: number }> = {
      ArrowRight: { axis: "x", sign: 1 },
      ArrowLeft: { axis: "x", sign: -1 },
      ArrowDown: { axis: "y", sign: 1 },
      ArrowUp: { axis: "y", sign: -1 },
    };

    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
      if (disabled) return;
      if (event.key === "Home") { event.preventDefault(); handleBoundaryKey("x", minX); return; }
      if (event.key === "End") { event.preventDefault(); handleBoundaryKey("x", maxX); return; }
      if (event.key === "PageUp") { event.preventDefault(); handleBoundaryKey("y", minY); return; }
      if (event.key === "PageDown") { event.preventDefault(); handleBoundaryKey("y", maxY); return; }

      const delta = STEP_KEY_DELTAS[event.key];
      if (!delta) return;
      event.preventDefault();

      const value = internalValue[valueIndexToChange];
      if (!value) return;
      const multiplier = (event.shiftKey && ARROW_KEYS.includes(event.key)) ? 10 : 1;
      setActiveDirection(delta.axis);

      const dirMultiplier = delta.axis === "x"
        ? (isSlidingFromLeft ? 1 : -1)
        : (isSlidingFromTop ? 1 : -1);
      const step = delta.axis === "x" ? stepX : stepY;
      const offset = step * multiplier * delta.sign * dirMultiplier;

      const vx = value[0] ?? 0;
      const vy = value[1] ?? 0;
      const point = delta.axis === "x" ? [vx + offset, vy] : [vx, vy + offset];
      updateValues(point, valueIndexToChange, { commit: true });
    }, [disabled, internalValue, valueIndexToChange, isSlidingFromLeft, isSlidingFromTop, stepX, stepY, minX, maxX, minY, maxY]);

    function handleBoundaryKey(axis: ActiveDirection, boundaryValue: number) {
      setActiveDirection(axis);
      const value = internalValue[valueIndexToChange];
      if (!value) return;
      let effectiveValue = boundaryValue;
      if (axis === "x" && !isSlidingFromLeft) effectiveValue = boundaryValue === minX ? maxX : minX;
      else if (axis === "y" && !isSlidingFromTop) effectiveValue = boundaryValue === minY ? maxY : minY;
      const point = axis === "x" ? [effectiveValue, value[1] ?? 0] : [value[0] ?? 0, effectiveValue];
      updateValues(point, valueIndexToChange, { commit: true });
    }

    const ctxValue = useMemo<ColorAreaContextValue>(() => ({
      disabled,
      minX, maxX, minY, maxY,
      currentModelValue: internalValue,
      valueIndexToChange,
      setValueIndexToChange,
      thumbXElements,
      thumbYElements,
      activeDirection,
      setActiveDirection,
      isSlidingFromLeft,
      isSlidingFromTop,
      thumbAlignment,
      colorSpace,
      xChannelKey,
      yChannelKey,
      colorRef,
      isDragging,
    }), [disabled, minX, maxX, minY, maxY, internalValue, valueIndexToChange, activeDirection, isSlidingFromLeft, isSlidingFromTop, thumbAlignment, colorSpace, xChannelKey, yChannelKey, colorRef, isDragging]);

    return (
      <ColorAreaContext.Provider value={ctxValue}>
        <div
          ref={(el) => {
            (elementRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            if (typeof ref === "function") ref(el);
            else if (ref) ref.current = el;
          }}
          data-slider-area-impl
          aria-disabled={disabled}
          data-disabled={disabled ? "" : undefined}
          className={className}
          style={{
            ...style,
            "--reka-slider-area-thumb-transform": `translate(${!isSlidingFromLeft && thumbAlignment === "overflow" ? "50%" : "-50%"}, ${!isSlidingFromTop && thumbAlignment === "overflow" ? "50%" : "-50%"})`,
          } as React.CSSProperties}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onKeyDown={handleKeyDown}
        >
          {children}
        </div>
      </ColorAreaContext.Provider>
    );
  },
);

import { forwardRef, useCallback, useMemo, useRef, useState } from "react";
import { Color } from "internationalized-color";
import { colorSpaces, getChannelConfig, displayToCulori, culoriToDisplay, type ChannelConfig } from "@urcolor/core";
import { cartesianToPolar, normalizeAngle } from "@urcolor/core";
import { ColorRingContext, type ColorRingContextValue } from "./ColorRingContext";

export interface ColorRingRootProps {
  value?: Color | string | null;
  defaultValue?: Color | string;
  disabled?: boolean;
  colorSpace?: string;
  channel?: string;
  startAngle?: number;
  innerRadius?: number;
  onValueChange?: (color: Color) => void;
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

export const ColorRingRoot = forwardRef<HTMLDivElement, ColorRingRootProps>(
  function ColorRingRoot(props, ref) {
    const {
      value: valueProp,
      defaultValue: defaultValueProp = "hsl(0, 100%, 50%)",
      disabled = false,
      colorSpace = "hsl",
      channel: channelProp,
      startAngle = 0,
      innerRadius = 0.7,
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
    const channelKey = channelProp ?? spaceConfig?.channels[0]?.key ?? "h";
    const isAlpha = channelKey === "alpha";
    const channelConfig = isAlpha ? ALPHA_CONFIG : getChannelConfig(colorSpace, channelKey);

    const min = channelConfig?.min ?? 0;
    const max = channelConfig?.max ?? 360;
    const step = channelConfig?.step ?? 1;

    function colorToDisplayValue(color: Color | undefined): number {
      if (!color || !channelConfig) return min;
      const converted = color.to(colorSpace);
      if (!converted) return min;
      const raw = isAlpha ? (color.alpha ?? 1) : converted.get(channelKey, 0);
      return culoriToDisplay(channelConfig, raw);
    }

    const [currentValue, setCurrentValue] = useState(() => colorToDisplayValue(colorRef));
    const [isDragging, setIsDragging] = useState(false);

    const prevColorRef = useRef(colorRef);
    if (colorRef !== prevColorRef.current) {
      prevColorRef.current = colorRef;
      const newVal = colorToDisplayValue(colorRef);
      if (Math.abs(currentValue - newVal) >= 0.001) setCurrentValue(newVal);
    }

    const thumbElement = useRef<HTMLElement | undefined>(undefined);
    const elementRef = useRef<HTMLDivElement>(null);
    const rectRef = useRef<DOMRect | undefined>(undefined);
    const valueBeforeSlide = useRef(currentValue);

    function snapValue(value: number): number {
      const decimals = (String(step).split(".")[1] || "").length;
      const snapped = Math.round((value - min) / step) * step + min;
      const factor = 10 ** decimals;
      return Math.max(min, Math.min(max, Math.round(snapped * factor) / factor));
    }

    function displayValueToColor(val: number): Color | undefined {
      if (!colorRef || !channelConfig) return undefined;
      const culoriVal = displayToCulori(channelConfig, val);
      if (isAlpha) return colorRef.set({ alpha: culoriVal });
      return colorRef.set({ mode: colorSpace, [channelKey]: culoriVal });
    }

    function getValueFromPointer(clientX: number, clientY: number): number {
      const el = elementRef.current;
      if (!el) return min;
      const rect = rectRef.current || el.getBoundingClientRect();
      rectRef.current = rect;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const { angle } = cartesianToPolar(clientX, clientY, cx, cy);
      const normalized = normalizeAngle(angle, startAngle);
      return min + (normalized / 360) * (max - min);
    }

    function updateValue(val: number, commit = false) {
      const snapped = snapValue(val);
      const hasChanged = Math.abs(snapped - currentValue) > 0.001;
      if (!hasChanged && !commit) return;
      setCurrentValue(snapped);
      if (hasChanged && !isDragging) thumbElement.current?.focus();
      const newColor = displayValueToColor(snapped);
      if (newColor) {
        if (!isControlled) setInternalColor(newColor);
        onValueChange?.(newColor);
        if (commit) onValueCommit?.(newColor);
      }
    }

    const handlePointerDown = useCallback((event: React.PointerEvent) => {
      if (disabled) return;
      const target = event.target as HTMLElement;
      const el = elementRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const outerR = Math.min(rect.width, rect.height) / 2;
      const innerR = outerR * innerRadius;
      const dx = event.clientX - cx;
      const dy = event.clientY - cy;
      const distSq = dx * dx + dy * dy;
      if (distSq > outerR * outerR || distSq < innerR * innerR) return;

      target.setPointerCapture(event.pointerId);
      event.preventDefault();
      thumbElement.current?.focus();
      setIsDragging(true);
      valueBeforeSlide.current = currentValue;
      updateValue(getValueFromPointer(event.clientX, event.clientY));
    }, [disabled, innerRadius, currentValue, min, max, step, startAngle, colorRef, channelConfig, isAlpha, colorSpace, channelKey, isControlled, onValueChange]);

    const rafPending = useRef(false);
    const handlePointerMove = useCallback((event: React.PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!target.hasPointerCapture(event.pointerId)) return;
      if (rafPending.current) return;
      rafPending.current = true;
      const { clientX, clientY } = event;
      requestAnimationFrame(() => {
        rafPending.current = false;
        updateValue(getValueFromPointer(clientX, clientY));
      });
    }, [min, max, step, startAngle, colorRef, channelConfig, isAlpha, colorSpace, channelKey, isControlled, onValueChange]);

    const handlePointerUp = useCallback((event: React.PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!target.hasPointerCapture(event.pointerId)) return;
      target.releasePointerCapture(event.pointerId);
      setIsDragging(false);
      rectRef.current = undefined;
      if (valueBeforeSlide.current !== currentValue && colorRef) onValueCommit?.(colorRef);
    }, [currentValue, colorRef, onValueCommit]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
      if (disabled) return;
      let offset = 0;
      const multiplier = event.shiftKey ? 10 : 1;
      if (event.key === "ArrowRight" || event.key === "ArrowUp") offset = step * multiplier;
      else if (event.key === "ArrowLeft" || event.key === "ArrowDown") offset = -step * multiplier;
      else if (event.key === "PageUp") offset = step * 10;
      else if (event.key === "PageDown") offset = -step * 10;
      else if (event.key === "Home") { updateValue(min, true); event.preventDefault(); return; }
      else if (event.key === "End") { updateValue(max, true); event.preventDefault(); return; }
      else return;

      event.preventDefault();
      let newVal = currentValue + offset;
      const isCyclic = channelConfig?.format === "degree";
      if (isCyclic) {
        newVal = ((newVal - min) % (max - min) + (max - min)) % (max - min) + min;
      } else {
        newVal = Math.max(min, Math.min(max, newVal));
      }
      updateValue(newVal, true);
    }, [disabled, step, currentValue, min, max, channelConfig, colorRef, isAlpha, colorSpace, channelKey, isControlled, onValueChange, onValueCommit]);

    const ctxValue = useMemo<ColorRingContextValue>(() => ({
      disabled, min, max, step, colorSpace, channelKey, colorRef, currentValue, startAngle, innerRadius, isDragging, thumbElement,
    }), [disabled, min, max, step, colorSpace, channelKey, colorRef, currentValue, startAngle, innerRadius, isDragging]);

    return (
      <ColorRingContext.Provider value={ctxValue}>
        <div
          ref={(el) => {
            (elementRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            if (typeof ref === "function") ref(el);
            else if (ref) ref.current = el;
          }}
          aria-disabled={disabled}
          data-disabled={disabled ? "" : undefined}
          className={className}
          style={style}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onKeyDown={handleKeyDown}
        >
          {children}
        </div>
      </ColorRingContext.Provider>
    );
  },
);

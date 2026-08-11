import { forwardRef, useCallback, useMemo, useRef, useState } from "react";
import { Color, type SpaceId } from "@urcolor/core";
import { cartesianToPolar, normalizeAngle, clampToCircle, colorSpaces, getChannelConfig, displayToNative, nativeToDisplay, type ChannelConfig } from "@urcolor/shared";
import { ColorWheelContext, type ColorWheelContextValue } from "./ColorWheelRootContext";

export interface ColorWheelRootProps {
  value?: Color | string | null;
  defaultValue?: Color | string;
  disabled?: boolean;
  colorSpace?: SpaceId;
  channelAngle?: string;
  channelRadius?: string;
  startAngle?: number;
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

const ALPHA_CONFIG: ChannelConfig = { key: "alpha", label: "Alpha", min: 0, max: 100, step: 1, format: "percentage", nativeMin: 0, nativeMax: 1 };

export const ColorWheelRoot = forwardRef<HTMLDivElement, ColorWheelRootProps>(
  function ColorWheelRoot(props, ref) {
    const {
      value: valueProp, defaultValue: defaultValueProp = "hsl(0, 100%, 50%)",
      disabled = false, colorSpace = "hsl",
      channelAngle: channelAngleProp, channelRadius: channelRadiusProp,
      startAngle = 0, onValueChange, onValueCommit,
      children, className, style,
    } = props;

    const isControlled = valueProp !== undefined;
    const [internalColor, setInternalColor] = useState<Color | undefined>(() => parseColor(valueProp) ?? parseColor(defaultValueProp));
    const prevValueRef = useRef(valueProp);
    if (valueProp !== prevValueRef.current) { prevValueRef.current = valueProp; const p = parseColor(valueProp); if (p) setInternalColor(p); }
    const colorRef = isControlled ? (parseColor(valueProp) ?? internalColor) : internalColor;

    const spaceConfig = colorSpaces[colorSpace];
    const angleChannelKey = channelAngleProp ?? spaceConfig?.channels[0]?.key ?? "h";
    const radiusChannelKey = channelRadiusProp ?? spaceConfig?.channels[1]?.key ?? "s";
    const angleIsAlpha = angleChannelKey === "alpha";
    const radiusIsAlpha = radiusChannelKey === "alpha";
    const angleConfig = angleIsAlpha ? ALPHA_CONFIG : getChannelConfig(colorSpace, angleChannelKey);
    const radiusConfig = radiusIsAlpha ? ALPHA_CONFIG : getChannelConfig(colorSpace, radiusChannelKey);

    const angleMin = angleConfig?.min ?? 0, angleMax = angleConfig?.max ?? 360, angleStep = angleConfig?.step ?? 1;
    const radiusMin = radiusConfig?.min ?? 0, radiusMax = radiusConfig?.max ?? 100, radiusStep = radiusConfig?.step ?? 1;

    function colorToDisplayValues(color: Color | undefined) {
      if (!color || !angleConfig || !radiusConfig) return { angle: angleMin, radius: radiusMin };
      const converted = color.to(colorSpace);
      const rawAngle = angleIsAlpha ? color.alpha : converted.get(angleChannelKey);
      const rawRadius = radiusIsAlpha ? color.alpha : converted.get(radiusChannelKey);
      return { angle: nativeToDisplay(angleConfig, rawAngle), radius: nativeToDisplay(radiusConfig, rawRadius) };
    }

    const init = colorToDisplayValues(colorRef);
    const [currentAngleValue, setCurrentAngleValue] = useState(init.angle);
    const [currentRadiusValue, setCurrentRadiusValue] = useState(init.radius);
    const [isDragging, setIsDragging] = useState(false);

    const thumbElement = useRef<HTMLElement | undefined>(undefined);
    const elementRef = useRef<HTMLDivElement>(null);
    const rectRef = useRef<DOMRect | undefined>(undefined);
    const valueBeforeSlide = useRef({ angle: currentAngleValue, radius: currentRadiusValue });

    const prevColorRef = useRef(colorRef);
    if (colorRef !== prevColorRef.current) {
      prevColorRef.current = colorRef;
      const nv = colorToDisplayValues(colorRef);
      if (Math.abs(currentAngleValue - nv.angle) > 0.001) setCurrentAngleValue(nv.angle);
      if (Math.abs(currentRadiusValue - nv.radius) > 0.001) setCurrentRadiusValue(nv.radius);
    }

    function displayValuesToColor(angle: number, radius: number): Color | undefined {
      if (!colorRef || !angleConfig || !radiusConfig) return undefined;
      const ca = displayToNative(angleConfig, angle);
      const cr = displayToNative(radiusConfig, radius);
      const updates: Record<string, number> = {};
      if (!angleIsAlpha) updates[angleChannelKey] = ca;
      if (!radiusIsAlpha) updates[radiusChannelKey] = cr;
      let result = colorRef.with({ space: colorSpace, ...updates });
      if (angleIsAlpha) result = result.withAlpha(ca);
      if (radiusIsAlpha) result = result.withAlpha(cr);
      return result;
    }

    function snap(value: number, min: number, max: number, step: number): number {
      const decimals = (String(step).split(".")[1] || "").length;
      const snapped = Math.round((value - min) / step) * step + min;
      const factor = 10 ** decimals;
      return Math.max(min, Math.min(max, Math.round(snapped * factor) / factor));
    }

    function updateValues(angle: number, radius: number, commit = false) {
      const sa = snap(angle, angleMin, angleMax, angleStep);
      const sr = snap(radius, radiusMin, radiusMax, radiusStep);
      setCurrentAngleValue(sa);
      setCurrentRadiusValue(sr);
      const newColor = displayValuesToColor(sa, sr);
      if (newColor) {
        if (!isControlled) setInternalColor(newColor);
        onValueChange?.(newColor);
        if (commit) onValueCommit?.(newColor);
      }
    }

    function getValuesFromPointer(clientX: number, clientY: number) {
      const el = elementRef.current;
      if (!el) return { angle: angleMin, radius: radiusMin };
      const rect = rectRef.current || el.getBoundingClientRect();
      rectRef.current = rect;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const maxR = Math.min(rect.width, rect.height) / 2;
      const clamped = clampToCircle(clientX, clientY, cx, cy, maxR);
      const { angle: rawAngle, radius } = cartesianToPolar(clamped.x, clamped.y, cx, cy);
      const normalizedAngle = normalizeAngle(rawAngle, startAngle);
      const normalizedRadius = Math.min(1, radius / maxR);
      return {
        angle: angleMin + (normalizedAngle / 360) * (angleMax - angleMin),
        radius: radiusMin + normalizedRadius * (radiusMax - radiusMin),
      };
    }

    const handlePointerDown = useCallback((event: React.PointerEvent) => {
      if (disabled) return;
      const target = event.target as HTMLElement;
      const el = elementRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const maxR = Math.min(rect.width, rect.height) / 2;
      const dx = event.clientX - cx;
      const dy = event.clientY - cy;
      if (dx * dx + dy * dy > maxR * maxR) return;
      target.setPointerCapture(event.pointerId);
      event.preventDefault();
      setIsDragging(true);
      valueBeforeSlide.current = { angle: currentAngleValue, radius: currentRadiusValue };
      const vals = getValuesFromPointer(event.clientX, event.clientY);
      updateValues(vals.angle, vals.radius);
    }, [disabled, currentAngleValue, currentRadiusValue, angleMin, angleMax, radiusMin, radiusMax, startAngle]);

    const rafPending = useRef(false);
    const handlePointerMove = useCallback((event: React.PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!target.hasPointerCapture(event.pointerId)) return;
      if (rafPending.current) return;
      rafPending.current = true;
      const { clientX, clientY } = event;
      requestAnimationFrame(() => {
        rafPending.current = false;
        const vals = getValuesFromPointer(clientX, clientY);
        updateValues(vals.angle, vals.radius);
      });
    }, [angleMin, angleMax, radiusMin, radiusMax, startAngle]);

    const handlePointerUp = useCallback((event: React.PointerEvent) => {
      // The capture is released when the element still holds it, but the
      // gesture ends either way. A browser that takes a drag over (a touch that
      // becomes a scroll, a context menu, a pointer leaving the window) drops
      // the capture first, and a release that insisted on it returned early and
      // left `isDragging` stuck at `true`. Every gradient suppresses its
      // repaints while a drag is in flight, so the surface then stopped
      // repainting for the rest of the component's life, silently.
      const target = event.target as HTMLElement;
      if (target.hasPointerCapture?.(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
      }
      setIsDragging(false);
      rectRef.current = undefined;
      const prev = valueBeforeSlide.current;
      if (prev.angle !== currentAngleValue || prev.radius !== currentRadiusValue) {
        if (colorRef) onValueCommit?.(colorRef);
      }
    }, [currentAngleValue, currentRadiusValue, colorRef, onValueCommit]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
      if (disabled) return;
      let angleOffset = 0, radiusOffset = 0;
      const multiplier = event.shiftKey ? 10 : 1;
      if (event.key === "ArrowRight") angleOffset = angleStep * multiplier;
      else if (event.key === "ArrowLeft") angleOffset = -angleStep * multiplier;
      else if (event.key === "ArrowUp") radiusOffset = radiusStep * multiplier;
      else if (event.key === "ArrowDown") radiusOffset = -radiusStep * multiplier;
      else if (event.key === "PageUp") radiusOffset = radiusStep * 10;
      else if (event.key === "PageDown") radiusOffset = -radiusStep * 10;
      else if (event.key === "Home") { updateValues(angleMin, radiusMin, true); event.preventDefault(); return; }
      else if (event.key === "End") { updateValues(angleMax, radiusMax, true); event.preventDefault(); return; }
      else return;
      event.preventDefault();
      let newAngle = currentAngleValue + angleOffset;
      const isCyclic = angleConfig?.format === "degree";
      if (isCyclic) { const r = angleMax - angleMin; newAngle = ((newAngle - angleMin) % r + r) % r + angleMin; }
      else newAngle = Math.max(angleMin, Math.min(angleMax, newAngle));
      const newRadius = Math.max(radiusMin, Math.min(radiusMax, currentRadiusValue + radiusOffset));
      updateValues(newAngle, newRadius, true);
    }, [disabled, currentAngleValue, currentRadiusValue, angleStep, radiusStep, angleMin, angleMax, radiusMin, radiusMax]);

    const ctxValue = useMemo<ColorWheelContextValue>(() => ({
      disabled, colorSpace, angleChannelKey, radiusChannelKey, colorRef,
      currentAngleValue, currentRadiusValue, angleMin, angleMax, radiusMin, radiusMax,
      startAngle, thumbElement, isDragging,
    }), [disabled, colorSpace, angleChannelKey, radiusChannelKey, colorRef, currentAngleValue, currentRadiusValue, angleMin, angleMax, radiusMin, radiusMax, startAngle, isDragging]);

    return (
      <ColorWheelContext.Provider value={ctxValue}>
        <div
          ref={(el) => { (elementRef as React.MutableRefObject<HTMLDivElement | null>).current = el; if (typeof ref === "function") ref(el); else if (ref) ref.current = el; }}
          aria-disabled={disabled} data-disabled={disabled ? "" : undefined}
          className={className} style={style}
          onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onKeyDown={handleKeyDown}
        >
          {children}
        </div>
      </ColorWheelContext.Provider>
    );
  },
);

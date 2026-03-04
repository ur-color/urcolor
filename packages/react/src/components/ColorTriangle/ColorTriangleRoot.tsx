import { forwardRef, useCallback, useMemo, useRef, useState } from "react";
import { Color } from "internationalized-color";
import { colorSpaces, getChannelConfig, displayToCulori, culoriToDisplay, type ChannelConfig, triangleVertices, clampToTriangle, barycentricCoords, pointInTriangle, type Point } from "@urcolor/core";
import { ColorTriangleContext, type ColorTriangleContextValue, type ActiveDirection } from "./ColorTriangleContext";

export interface ColorTriangleRootProps {
  value?: Color | string | null;
  defaultValue?: Color | string;
  disabled?: boolean;
  colorSpace?: string;
  channelX?: string;
  channelY?: string;
  channelZ?: string;
  rotation?: number;
  inverted?: boolean;
  thumbAlignment?: "contain" | "overflow";
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

export const ColorTriangleRoot = forwardRef<HTMLDivElement, ColorTriangleRootProps>(
  function ColorTriangleRoot(props, ref) {
    const {
      value: valueProp,
      defaultValue: defaultValueProp = "hsl(0, 100%, 50%)",
      disabled = false,
      colorSpace = "hsv",
      channelX: channelXProp,
      channelY: channelYProp,
      channelZ: channelZProp,
      rotation = 0,
      inverted = false,
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
    const xChannelKey = channelXProp ?? spaceConfig?.channels[1]?.key ?? "s";
    const yChannelKey = channelYProp ?? spaceConfig?.channels[2]?.key ?? "v";
    const zChannelKey = channelZProp;
    const isThreeChannel = zChannelKey != null;

    const xIsAlpha = xChannelKey === "alpha";
    const yIsAlpha = yChannelKey === "alpha";
    const zIsAlpha = zChannelKey === "alpha";
    const xConfig = xIsAlpha ? ALPHA_CONFIG : getChannelConfig(colorSpace, xChannelKey);
    const yConfig = yIsAlpha ? ALPHA_CONFIG : getChannelConfig(colorSpace, yChannelKey);
    const zConfig = zChannelKey ? (zIsAlpha ? ALPHA_CONFIG : getChannelConfig(colorSpace, zChannelKey)) : undefined;

    const xMin = xConfig?.min ?? 0;
    const xMax = xConfig?.max ?? 100;
    const xStep = xConfig?.step ?? 1;
    const yMin = yConfig?.min ?? 0;
    const yMax = yConfig?.max ?? 100;
    const yStep = yConfig?.step ?? 1;
    const zMin = zConfig?.min ?? 0;
    const zMax = zConfig?.max ?? 100;
    const zStep = zConfig?.step ?? 1;

    const vertices = useMemo<[Point, Point, Point]>(() => {
      const [v0, v1, v2] = triangleVertices(1, 1, rotation);
      return inverted ? [v0, v2, v1] : [v0, v1, v2];
    }, [rotation, inverted]);

    const clipPathStyle = useMemo(() => {
      const pts = vertices.map(p => `${(p.x * 100).toFixed(2)}% ${(p.y * 100).toFixed(2)}%`).join(", ");
      return { clipPath: `polygon(${pts})`, ...style };
    }, [vertices, style]);

    function colorToDisplayValues(color: Color | undefined): { x: number; y: number; z: number } {
      if (!color || !xConfig || !yConfig) return { x: xMin, y: yMin, z: zMin };
      const converted = color.to(colorSpace);
      if (!converted) return { x: xMin, y: yMin, z: zMin };
      const rawX = xIsAlpha ? (color.alpha ?? 1) : converted.get(xChannelKey, 0);
      const rawY = yIsAlpha ? (color.alpha ?? 1) : converted.get(yChannelKey, 0);
      const rawZ = zChannelKey ? (zIsAlpha ? (color.alpha ?? 1) : converted.get(zChannelKey, 0)) : 0;
      return {
        x: culoriToDisplay(xConfig, rawX),
        y: culoriToDisplay(yConfig, rawY),
        z: zConfig ? culoriToDisplay(zConfig, rawZ) : zMin,
      };
    }

    const initValues = colorToDisplayValues(colorRef);
    const [currentXValue, setCurrentXValue] = useState(initValues.x);
    const [currentYValue, setCurrentYValue] = useState(initValues.y);
    const [currentZValue, setCurrentZValue] = useState(initValues.z);
    const [isDragging, setIsDragging] = useState(false);
    const [activeDirection, setActiveDirection] = useState<ActiveDirection>("x");

    const prevColorRef = useRef(colorRef);
    if (colorRef !== prevColorRef.current) {
      prevColorRef.current = colorRef;
      const newVals = colorToDisplayValues(colorRef);
      if (Math.abs(currentXValue - newVals.x) > 0.001) setCurrentXValue(newVals.x);
      if (Math.abs(currentYValue - newVals.y) > 0.001) setCurrentYValue(newVals.y);
      if (Math.abs(currentZValue - newVals.z) > 0.001) setCurrentZValue(newVals.z);
    }

    const thumbXElement = useRef<HTMLElement | undefined>(undefined);
    const thumbYElement = useRef<HTMLElement | undefined>(undefined);
    const thumbZElement = useRef<HTMLElement | undefined>(undefined);
    const thumbElement = useRef<HTMLElement | undefined>(undefined);
    const elementRef = useRef<HTMLDivElement>(null);
    const rectRef = useRef<DOMRect | undefined>(undefined);
    const valueBeforeSlide = useRef({ x: currentXValue, y: currentYValue, z: currentZValue });

    function snap(value: number, min: number, max: number, step: number): number {
      const decimals = (String(step).split(".")[1] || "").length;
      const snapped = Math.round((value - min) / step) * step + min;
      const factor = 10 ** decimals;
      return Math.max(min, Math.min(max, Math.round(snapped * factor) / factor));
    }

    function displayValuesToColor(xVal: number, yVal: number, zVal?: number): Color | undefined {
      if (!colorRef || !xConfig || !yConfig) return undefined;
      const culoriX = displayToCulori(xConfig, xVal);
      const culoriY = displayToCulori(yConfig, yVal);
      const updates: Record<string, number> = {};
      if (!xIsAlpha) updates[xChannelKey] = culoriX;
      if (!yIsAlpha) updates[yChannelKey] = culoriY;
      if (zChannelKey && zConfig && zVal != null) {
        const culoriZ = displayToCulori(zConfig, zVal);
        if (!zIsAlpha) updates[zChannelKey] = culoriZ;
      }
      let result = colorRef.set({ mode: colorSpace, ...updates });
      if (xIsAlpha) result = result.set({ alpha: culoriX });
      if (yIsAlpha) result = result.set({ alpha: culoriY });
      if (zChannelKey && zConfig && zVal != null && zIsAlpha) {
        result = result.set({ alpha: displayToCulori(zConfig, zVal) });
      }
      return result;
    }

    function getValuesFromPointer(clientX: number, clientY: number): { x: number; y: number; z?: number } {
      const el = elementRef.current;
      if (!el) return { x: xMin, y: yMin };
      const rect = rectRef.current || el.getBoundingClientRect();
      rectRef.current = rect;

      const nx = (clientX - rect.left) / rect.width;
      const ny = (clientY - rect.top) / rect.height;

      const [v0, v1, v2] = vertices;
      const clamped = clampToTriangle(nx, ny, v0, v1, v2);
      const { u, v, w } = barycentricCoords(clamped.x, clamped.y, v0, v1, v2);
      const cu = Math.max(0, u), cv = Math.max(0, v), cw = Math.max(0, w);
      const sum = cu + cv + cw;
      const nu = cu / sum, nv = cv / sum, nw = cw / sum;

      if (isThreeChannel) {
        return {
          x: nu * xMax + (1 - nu) * xMin,
          y: nv * yMax + (1 - nv) * yMin,
          z: nw * zMax + (1 - nw) * zMin,
        };
      }
      return {
        x: nu * xMax + nv * xMin + nw * xMin,
        y: nu * yMax + nv * yMax + nw * yMin,
      };
    }

    function updateValues(xVal: number, yVal: number, commit = false, zVal?: number) {
      const snappedX = snap(xVal, xMin, xMax, xStep);
      const snappedY = snap(yVal, yMin, yMax, yStep);
      const snappedZ = zVal != null ? snap(zVal, zMin, zMax, zStep) : undefined;

      setCurrentXValue(snappedX);
      setCurrentYValue(snappedY);
      if (snappedZ != null) setCurrentZValue(snappedZ);

      const newColor = displayValuesToColor(snappedX, snappedY, snappedZ);
      if (newColor) {
        if (!isControlled) setInternalColor(newColor);
        onValueChange?.(newColor);
        if (commit) onValueCommit?.(newColor);
      }
    }

    function channelsToBary(): { u: number; v: number; w: number } {
      const xRange = xMax - xMin;
      const yRange = yMax - yMin;

      if (isThreeChannel) {
        const u = xRange > 0 ? (currentXValue - xMin) / xRange : 0;
        const v = yRange > 0 ? (currentYValue - yMin) / yRange : 0;
        const w = Math.max(0, 1 - u - v);
        const sum = u + v + w;
        return sum > 0 ? { u: u / sum, v: v / sum, w: w / sum } : { u: 1 / 3, v: 1 / 3, w: 1 / 3 };
      }
      const u = xRange > 0 ? (currentXValue - xMin) / xRange : 0;
      const w = yRange > 0 ? (yMax - currentYValue) / yRange : 0;
      const v = Math.max(0, 1 - u - w);
      const sum = u + v + w;
      return sum > 0 ? { u: u / sum, v: v / sum, w: w / sum } : { u: 1 / 3, v: 1 / 3, w: 1 / 3 };
    }

    function baryToChannels(u: number, v: number, w: number): { x: number; y: number; z?: number } {
      if (isThreeChannel) {
        return {
          x: u * xMax + (1 - u) * xMin,
          y: v * yMax + (1 - v) * yMin,
          z: w * zMax + (1 - w) * zMin,
        };
      }
      return {
        x: u * xMax + (1 - u) * xMin,
        y: (1 - w) * yMax + w * yMin,
      };
    }

    function handleKeyDown3Channel(event: React.KeyboardEvent) {
      const step = 0.05;
      const multiplier = event.shiftKey ? 4 : 1;
      let channelDelta = 0;

      switch (event.key) {
        case "ArrowUp": case "ArrowRight": channelDelta = step * multiplier; break;
        case "ArrowDown": case "ArrowLeft": channelDelta = -step * multiplier; break;
        case "PageUp": channelDelta = step * 4; break;
        case "PageDown": channelDelta = -step * 4; break;
        case "Home": {
          const u = activeDirection === "x" ? 1 : 0;
          const v = activeDirection === "y" ? 1 : 0;
          const w = activeDirection === "z" ? 1 : 0;
          const vals = baryToChannels(u, v, w);
          updateValues(vals.x, vals.y, true, vals.z);
          event.preventDefault();
          return;
        }
        case "End": {
          const vals = baryToChannels(1 / 3, 1 / 3, 1 / 3);
          updateValues(vals.x, vals.y, true, vals.z);
          event.preventDefault();
          return;
        }
        default: return;
      }

      event.preventDefault();
      const bary = channelsToBary();
      let newU = bary.u, newV = bary.v, newW = bary.w;
      const ad = activeDirection;
      const focused = ad === "x" ? newU : ad === "y" ? newV : newW;
      const newFocused = Math.max(0, Math.min(1, focused + channelDelta));
      const actualDelta = newFocused - focused;
      const origU = newU, origV = newV, origW = newW;

      if (ad === "x") newU = newFocused;
      else if (ad === "y") newV = newFocused;
      else newW = newFocused;

      function redistribute(a: number, b: number, delta: number): [number, number] {
        const sum = a + b;
        if (sum > 0) return [a - delta * (a / sum), b - delta * (b / sum)];
        return [-delta / 2, -delta / 2];
      }

      if (ad === "x") [newV, newW] = redistribute(origV, origW, actualDelta);
      else if (ad === "y") [newU, newW] = redistribute(origU, origW, actualDelta);
      else [newU, newV] = redistribute(origU, origV, actualDelta);

      newU = Math.max(0, newU);
      newV = Math.max(0, newV);
      newW = Math.max(0, newW);
      const sum = newU + newV + newW;
      if (sum > 0) { newU /= sum; newV /= sum; newW /= sum; }

      const vals = baryToChannels(newU, newV, newW);
      updateValues(vals.x, vals.y, true, vals.z);
    }

    function handleKeyDown2Channel(event: React.KeyboardEvent) {
      const multiplier = event.shiftKey ? 4 : 1;
      let newX = currentXValue;
      let newY = currentYValue;
      let targetedY = false;

      switch (event.key) {
        case "ArrowRight": newY = Math.min(yMax, newY + yStep * multiplier); targetedY = true; break;
        case "ArrowLeft": newY = Math.max(yMin, newY - yStep * multiplier); targetedY = true; break;
        case "ArrowUp": newX = Math.min(xMax, newX + xStep * multiplier); break;
        case "ArrowDown": newX = Math.max(xMin, newX - xStep * multiplier); break;
        case "PageUp": case "Home": newX = xMax; newY = yMax; break;
        case "PageDown": case "End": newX = xMin; newY = yMin; break;
        default: return;
      }

      const xRange = xMax - xMin;
      const yRange = yMax - yMin;
      if (xRange > 0 && yRange > 0) {
        const u = (newX - xMin) / xRange;
        const w = (yMax - newY) / yRange;
        if (u + w > 1) {
          if (targetedY) newX = xMin + (1 - w) * xRange;
          else newY = yMax - (1 - u) * yRange;
        }
      }

      event.preventDefault();
      updateValues(newX, newY, true);
    }

    const handlePointerDown = useCallback((event: React.PointerEvent) => {
      if (disabled) return;
      const target = event.target as HTMLElement;
      const el = elementRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width;
      const ny = (event.clientY - rect.top) / rect.height;
      const [hv0, hv1, hv2] = vertices;
      if (!pointInTriangle(nx, ny, hv0, hv1, hv2)) return;

      target.setPointerCapture(event.pointerId);
      event.preventDefault();

      if (thumbXElement.current && (target === thumbXElement.current || thumbXElement.current.contains(target))) {
        setActiveDirection("x");
        thumbXElement.current.focus();
      } else if (thumbYElement.current && (target === thumbYElement.current || thumbYElement.current.contains(target))) {
        setActiveDirection("y");
        thumbYElement.current.focus();
      } else if (thumbZElement.current && (target === thumbZElement.current || thumbZElement.current.contains(target))) {
        setActiveDirection("z");
        thumbZElement.current.focus();
      } else {
        setActiveDirection("x");
        thumbXElement.current?.focus();
      }

      setIsDragging(true);
      valueBeforeSlide.current = { x: currentXValue, y: currentYValue, z: currentZValue };
      rectRef.current = rect;
      const vals = getValuesFromPointer(event.clientX, event.clientY);
      updateValues(vals.x, vals.y, false, vals.z);
    }, [disabled, vertices, currentXValue, currentYValue, currentZValue, xMin, xMax, yMin, yMax, zMin, zMax, colorRef, xConfig, yConfig, zConfig, isThreeChannel, isControlled, onValueChange]);

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
        updateValues(vals.x, vals.y, false, vals.z);
      });
    }, [vertices, xMin, xMax, yMin, yMax, zMin, zMax, colorRef, xConfig, yConfig, zConfig, isThreeChannel, isControlled, onValueChange]);

    const handlePointerUp = useCallback((event: React.PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!target.hasPointerCapture(event.pointerId)) return;
      target.releasePointerCapture(event.pointerId);
      setIsDragging(false);
      rectRef.current = undefined;
      const prev = valueBeforeSlide.current;
      if (prev.x !== currentXValue || prev.y !== currentYValue || prev.z !== currentZValue) {
        if (colorRef) onValueCommit?.(colorRef);
      }
    }, [currentXValue, currentYValue, currentZValue, colorRef, onValueCommit]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
      if (disabled) return;
      if (isThreeChannel) handleKeyDown3Channel(event);
      else handleKeyDown2Channel(event);
    }, [disabled, isThreeChannel, activeDirection, currentXValue, currentYValue, currentZValue, xMin, xMax, yMin, yMax, zMin, zMax, xStep, yStep, zStep, colorRef, xConfig, yConfig, zConfig, isControlled, onValueChange, onValueCommit]);

    const ctxValue = useMemo<ColorTriangleContextValue>(() => ({
      disabled, colorSpace, xChannelKey, yChannelKey, zChannelKey,
      colorRef, currentXValue, currentYValue, currentZValue,
      xMin, xMax, yMin, yMax, zMin, zMax,
      isThreeChannel, rotation, vertices,
      activeDirection, setActiveDirection,
      thumbXElement, thumbYElement, thumbZElement,
      isDragging, thumbAlignment, thumbElement,
    }), [disabled, colorSpace, xChannelKey, yChannelKey, zChannelKey, colorRef, currentXValue, currentYValue, currentZValue, xMin, xMax, yMin, yMax, zMin, zMax, isThreeChannel, rotation, vertices, activeDirection, isDragging, thumbAlignment]);

    return (
      <ColorTriangleContext.Provider value={ctxValue}>
        <div
          ref={(el) => {
            (elementRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            if (typeof ref === "function") ref(el);
            else if (ref) ref.current = el;
          }}
          aria-disabled={disabled}
          data-disabled={disabled ? "" : undefined}
          data-color-triangle-root=""
          className={className}
          style={clipPathStyle}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onKeyDown={handleKeyDown}
        >
          {children}
        </div>
      </ColorTriangleContext.Provider>
    );
  },
);

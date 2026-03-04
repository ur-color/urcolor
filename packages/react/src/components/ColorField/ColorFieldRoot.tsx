import { forwardRef, useCallback, useMemo, useRef, useState } from "react";
import { Color } from "internationalized-color";
import { getChannelConfig, displayToCulori, culoriToDisplay, type ChannelConfig } from "@urcolor/core";
import { clamp, snapToStep } from "../../utils";
import { ColorFieldContext, type ColorFieldContextValue } from "./ColorFieldContext";

export interface ColorFieldRootProps {
  /** The controlled color value. */
  value?: Color | string | null;
  /** The default color value when uncontrolled. */
  defaultValue?: Color | string | null;
  /** The color space mode (e.g. 'hsl', 'oklch'). */
  colorSpace?: string;
  /** Which channel this field controls (e.g. 'h', 's', 'l'). */
  channel?: string;
  /** Channel display format. Auto-derived from colorSpace config if not set. */
  format?: "number" | "degree" | "percentage" | "hex";
  /** Minimum allowed value. */
  min?: number;
  /** Maximum allowed value. */
  max?: number;
  /** Step increment for arrow keys. */
  step?: number;
  /** Whether the field is disabled. */
  disabled?: boolean;
  /** Whether the field is read-only. */
  readOnly?: boolean;
  /** Callback fired when the color value changes. */
  onValueChange?: (color: Color) => void;
  /** Callback fired when the value changes at the end of an interaction. */
  onValueCommit?: (color: Color) => void;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: React.ElementType;
}

function parseColor(v: Color | string | null | undefined): Color | undefined {
  if (!v) return undefined;
  if (v instanceof Color) return v;
  return Color.parse(v) ?? undefined;
}

const ALPHA_CONFIG: ChannelConfig = { key: "alpha", label: "Alpha", min: 0, max: 100, step: 1, format: "percentage", culoriMin: 0, culoriMax: 1 };

export const ColorFieldRoot = forwardRef<HTMLDivElement, ColorFieldRootProps>(
  function ColorFieldRoot(props, ref) {
    const {
      value: valueProp,
      defaultValue: defaultValueProp,
      colorSpace = "hsl",
      channel = "h",
      format: formatProp,
      min: minProp,
      max: maxProp,
      step: stepProp,
      disabled = false,
      readOnly = false,
      onValueChange,
      onValueCommit,
      children,
      className,
      style,
      as: Component = "div",
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

    const isAlpha = channel === "alpha";
    const channelConfig = isAlpha ? ALPHA_CONFIG : getChannelConfig(colorSpace, channel);

    const effectiveFormat = formatProp ?? channelConfig?.format ?? "number";
    const isHexMode = effectiveFormat === "hex";
    const effectiveMin = minProp ?? channelConfig?.min ?? 0;
    const effectiveMax = maxProp ?? channelConfig?.max ?? (isHexMode ? 0xFFFFFF : 100);
    const effectiveStep = stepProp ?? channelConfig?.step ?? 1;

    function getDisplayValue(): number | undefined {
      if (!colorRef) return undefined;
      if (isHexMode) {
        const hex = colorRef.toHex()?.replace(/^#/, "");
        if (!hex) return undefined;
        return Number.parseInt(hex.slice(0, 6), 16);
      }
      if (!channelConfig) return undefined;
      if (isAlpha) return Math.round((colorRef.alpha ?? 1) * 100);
      const converted = colorRef.to(colorSpace);
      if (!converted) return undefined;
      const raw = converted.get(channel, 0);
      return culoriToDisplay(channelConfig, raw);
    }

    const [numericValue, setNumericValue] = useState<number | undefined>(() => getDisplayValue());

    // Sync from color changes
    const prevColorRef = useRef(colorRef);
    if (colorRef !== prevColorRef.current) {
      prevColorRef.current = colorRef;
      const v = getDisplayValue();
      if (v !== undefined && Math.abs((v ?? 0) - (numericValue ?? 0)) > 0.001) {
        setNumericValue(v);
      }
    }

    function formatValue(val: number | undefined): string {
      if (val === undefined) return "";
      switch (effectiveFormat) {
        case "degree": return `${val}\u00B0`;
        case "percentage": return `${val}%`;
        case "hex": return `#${Math.round(val).toString(16).padStart(6, "0")}`;
        default: return String(val);
      }
    }

    function parseValue(text: string): number | undefined {
      const trimmed = text.trim();
      if (trimmed === "") return undefined;
      switch (effectiveFormat) {
        case "degree": return Number.parseFloat(trimmed.replace(/[\u00B0]$|deg$/i, ""));
        case "percentage": return Number.parseFloat(trimmed.replace(/%$/, ""));
        case "hex": {
          const hex = trimmed.replace(/^#/, "");
          if (!/^[0-9a-f]*$/i.test(hex)) return undefined;
          return Number.parseInt(hex, 16);
        }
        default: return Number.parseFloat(trimmed);
      }
    }

    function clampValue(val: number): number {
      let clamped = clamp(val, effectiveMin, effectiveMax);
      clamped = snapToStep(clamped, effectiveMin, effectiveMax, effectiveStep);
      return clamped;
    }

    const [displayValue, setDisplayValue] = useState(() => formatValue(numericValue));

    // Keep display value in sync
    const prevNumericRef = useRef(numericValue);
    if (numericValue !== prevNumericRef.current) {
      prevNumericRef.current = numericValue;
      setDisplayValue(formatValue(numericValue));
    }

    function rebuildColor(displayVal: number): Color | undefined {
      if (!colorRef) return undefined;
      if (isHexMode) {
        const hexStr = `#${Math.round(clamp(displayVal, 0, 0xFFFFFF)).toString(16).padStart(6, "0")}`;
        return Color.parse(hexStr) ?? undefined;
      }
      if (!channelConfig) return undefined;
      if (isAlpha) return colorRef.set({ alpha: displayVal / 100 });
      const culoriVal = displayToCulori(channelConfig, displayVal);
      return colorRef.set({ mode: colorSpace, [channel]: culoriVal });
    }

    function emitColor(val: number): Color | undefined {
      const newColor = rebuildColor(val);
      if (newColor) {
        if (!isControlled) setInternalColor(newColor);
        onValueChange?.(newColor);
      }
      return newColor;
    }

    const inputRef = useRef<HTMLInputElement>(null);

    const commitValue = useCallback((val: number | undefined) => {
      if (val === undefined || Number.isNaN(val)) {
        setNumericValue(undefined);
        setDisplayValue("");
        return;
      }
      const clamped = isHexMode ? clamp(Math.round(val), effectiveMin, effectiveMax) : clampValue(val);
      setNumericValue(clamped);
      setDisplayValue(formatValue(clamped));
      const newColor = emitColor(clamped);
      if (newColor) onValueCommit?.(newColor);
    }, [isHexMode, effectiveMin, effectiveMax, effectiveStep, colorRef, channelConfig, isAlpha, colorSpace, channel, isControlled, onValueChange, onValueCommit]);

    const onInputChange = useCallback((text: string) => {
      setDisplayValue(text);
      const parsed = parseValue(text);
      if (parsed !== undefined && !Number.isNaN(parsed)) {
        setNumericValue(parsed);
        emitColor(parsed);
      }
    }, [colorRef, channelConfig, isAlpha, isHexMode, colorSpace, channel, isControlled, onValueChange]);

    const handleIncrease = useCallback((multiplier = 1) => {
      if (disabled || readOnly) return;
      const current = numericValue ?? 0;
      const next = clampValue(current + effectiveStep * multiplier);
      setNumericValue(next);
      setDisplayValue(formatValue(next));
      const newColor = emitColor(next);
      if (newColor) onValueCommit?.(newColor);
    }, [disabled, readOnly, numericValue, effectiveStep, effectiveMin, effectiveMax, colorRef, channelConfig, isAlpha, colorSpace, channel, isControlled, onValueChange, onValueCommit]);

    const handleDecrease = useCallback((multiplier = 1) => {
      if (disabled || readOnly) return;
      const current = numericValue ?? 0;
      const next = clampValue(current - effectiveStep * multiplier);
      setNumericValue(next);
      setDisplayValue(formatValue(next));
      const newColor = emitColor(next);
      if (newColor) onValueCommit?.(newColor);
    }, [disabled, readOnly, numericValue, effectiveStep, effectiveMin, effectiveMax, colorRef, channelConfig, isAlpha, colorSpace, channel, isControlled, onValueChange, onValueCommit]);

    const handleMinMaxValue = useCallback((type: "min" | "max") => {
      if (disabled || readOnly) return;
      const val = type === "min" ? effectiveMin : effectiveMax;
      setNumericValue(val);
      setDisplayValue(formatValue(val));
      const newColor = emitColor(val);
      if (newColor) onValueCommit?.(newColor);
    }, [disabled, readOnly, effectiveMin, effectiveMax, colorRef, channelConfig, isAlpha, colorSpace, channel, isControlled, onValueChange, onValueCommit]);

    const isDecreaseDisabled = numericValue !== undefined && clampValue(numericValue) <= effectiveMin;
    const isIncreaseDisabled = numericValue !== undefined && clampValue(numericValue) >= effectiveMax;

    const ctxValue = useMemo<ColorFieldContextValue>(() => ({
      modelValue: numericValue,
      displayValue,
      disabled,
      readOnly,
      isDecreaseDisabled,
      isIncreaseDisabled,
      handleIncrease,
      handleDecrease,
      handleMinMaxValue,
      commitValue,
      onInputChange,
      inputRef,
      format: effectiveFormat,
    }), [numericValue, displayValue, disabled, readOnly, isDecreaseDisabled, isIncreaseDisabled, handleIncrease, handleDecrease, handleMinMaxValue, commitValue, onInputChange, effectiveFormat]);

    return (
      <ColorFieldContext.Provider value={ctxValue}>
        <Component
          ref={ref}
          className={className}
          style={style}
          data-disabled={disabled ? "" : undefined}
          data-readonly={readOnly ? "" : undefined}
        >
          {children}
        </Component>
      </ColorFieldContext.Provider>
    );
  },
);

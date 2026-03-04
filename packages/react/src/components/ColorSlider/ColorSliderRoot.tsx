import { forwardRef, useCallback, useMemo, useRef, useState } from "react";
import { Slider } from "@base-ui-components/react/slider";
import { Color } from "internationalized-color";
import { getChannelConfig, displayToCulori, culoriToDisplay } from "@urcolor/core";
import { ColorSliderContext, type ColorSliderContextValue } from "./ColorSliderContext";

export interface ColorSliderRootProps {
  /** The controlled color value. */
  value?: Color | string | null;
  /** The default color value when uncontrolled. */
  defaultValue?: Color | string | null;
  /** The color space mode (e.g. 'hsl', 'oklch'). */
  colorSpace?: string;
  /** Which channel this slider controls (e.g. 'h', 's', 'l'). */
  channel?: string;
  /** When true, prevents the user from interacting with the slider. */
  disabled?: boolean;
  /** The reading direction. */
  dir?: "ltr" | "rtl";
  /** Whether the slider is visually inverted. */
  inverted?: boolean;
  /** The orientation of the slider. */
  orientation?: "horizontal" | "vertical";
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

const DEFAULT_COLOR = Color.parse("hsl(210, 80%, 50%)")!;

const ALPHA_CONFIG = { key: "alpha", label: "Alpha", min: 0, max: 100, step: 1, format: "percentage" as const, culoriMin: 0, culoriMax: 1 };

export const ColorSliderRoot = forwardRef<HTMLDivElement, ColorSliderRootProps>(
  function ColorSliderRoot(props, ref) {
    const {
      value: valueProp,
      defaultValue: defaultValueProp,
      colorSpace = "hsl",
      channel = "h",
      disabled = false,
      dir,
      inverted = false,
      orientation = "horizontal",
      onValueChange,
      onValueCommit,
      children,
      className,
      style,
    } = props;

    const isControlled = valueProp !== undefined;
    const [internalColor, setInternalColor] = useState<Color>(
      () => parseColor(valueProp) ?? parseColor(defaultValueProp) ?? DEFAULT_COLOR,
    );

    // Track external value changes
    const prevValueRef = useRef(valueProp);
    if (valueProp !== prevValueRef.current) {
      prevValueRef.current = valueProp;
      const parsed = parseColor(valueProp);
      if (parsed) setInternalColor(parsed);
    }

    const colorRef = isControlled ? (parseColor(valueProp) ?? internalColor) : internalColor;

    const isAlpha = channel === "alpha";
    const channelConfig = isAlpha ? ALPHA_CONFIG : getChannelConfig(colorSpace, channel);

    const sliderValue = useMemo(() => {
      if (!colorRef || !channelConfig) return channelConfig?.min ?? 0;
      if (isAlpha) return Math.round((colorRef.alpha ?? 1) * 100);
      const converted = colorRef.to(colorSpace);
      if (!converted) return channelConfig.min;
      const raw = converted.get(channel, 0);
      return culoriToDisplay(channelConfig, raw);
    }, [colorRef, channelConfig, isAlpha, colorSpace, channel]);

    const handleValueChange = useCallback((val: number) => {
      if (!channelConfig) return;
      let newColor: Color | undefined;
      if (isAlpha) {
        newColor = colorRef.set({ alpha: val / 100 });
      } else {
        const culoriVal = displayToCulori(channelConfig, val);
        newColor = colorRef.set({ mode: colorSpace, [channel]: culoriVal });
      }
      if (newColor) {
        if (!isControlled) setInternalColor(newColor);
        onValueChange?.(newColor);
      }
    }, [channelConfig, isAlpha, colorRef, colorSpace, channel, isControlled, onValueChange]);

    const handleValueCommitted = useCallback((val: number) => {
      if (!channelConfig) return;
      let newColor: Color | undefined;
      if (isAlpha) {
        newColor = colorRef.set({ alpha: val / 100 });
      } else {
        const culoriVal = displayToCulori(channelConfig, val);
        newColor = colorRef.set({ mode: colorSpace, [channel]: culoriVal });
      }
      if (newColor) onValueCommit?.(newColor);
    }, [channelConfig, isAlpha, colorRef, colorSpace, channel, onValueCommit]);

    const ctxValue = useMemo<ColorSliderContextValue>(() => ({
      colorRef,
      channel,
      colorSpace,
      orientation,
      inverted,
    }), [colorRef, channel, colorSpace, orientation, inverted]);

    return (
      <ColorSliderContext.Provider value={ctxValue}>
        <Slider.Root
          ref={ref}
          value={sliderValue}
          onValueChange={handleValueChange}
          onValueCommitted={handleValueCommitted}
          min={channelConfig?.min ?? 0}
          max={channelConfig?.max ?? 100}
          step={channelConfig?.step ?? 1}
          disabled={disabled}
          orientation={orientation}
          className={className}
          style={style}
        >
          {children}
        </Slider.Root>
      </ColorSliderContext.Provider>
    );
  },
);

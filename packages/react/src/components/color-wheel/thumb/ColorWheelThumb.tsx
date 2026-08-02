import { forwardRef, useEffect, useMemo, useRef, type ComponentPropsWithoutRef } from "react";
import { channelLabel, formatChannelValue } from "@urcolor/primitives";
import { useColorWheelContext } from "../root/ColorWheelRootContext";

export interface ColorWheelThumbProps extends ComponentPropsWithoutRef<"span"> {}

export const ColorWheelThumb = forwardRef<HTMLSpanElement, ColorWheelThumbProps>(
  function ColorWheelThumb({ style, children, ...props }, ref) {
    const ctx = useColorWheelContext();
    const elRef = useRef<HTMLSpanElement | null>(null);

    useEffect(() => {
      ctx.thumbElement.current = elRef.current ?? undefined;
      return () => {
        if (ctx.thumbElement.current === elRef.current) ctx.thumbElement.current = undefined;
      };
    }, [ctx]);

    const angleDeg = useMemo(() => {
      const range = ctx.angleMax - ctx.angleMin;
      if (range === 0) return ctx.startAngle;
      return ((ctx.currentAngleValue - ctx.angleMin) / range) * 360 + ctx.startAngle;
    }, [ctx.currentAngleValue, ctx.angleMin, ctx.angleMax, ctx.startAngle]);

    const radiusPercent = useMemo(() => {
      const range = ctx.radiusMax - ctx.radiusMin;
      if (range === 0) return 0;
      return ((ctx.currentRadiusValue - ctx.radiusMin) / range) * 50;
    }, [ctx.currentRadiusValue, ctx.radiusMin, ctx.radiusMax]);

    const angleLabelText = channelLabel(ctx.colorSpace, ctx.angleChannelKey);
    const radiusLabelText = channelLabel(ctx.colorSpace, ctx.radiusChannelKey);
    const ariaLabel = `${angleLabelText}, ${radiusLabelText}`;
    const ariaValueText
      = `${angleLabelText} ${formatChannelValue(ctx.colorSpace, ctx.angleChannelKey, ctx.currentAngleValue)}, `
        + `${radiusLabelText} ${formatChannelValue(ctx.colorSpace, ctx.radiusChannelKey, ctx.currentRadiusValue)}`;

    return (
      <span
        ref={(el) => {
          elRef.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        role="slider"
        tabIndex={ctx.disabled ? undefined : 0}
        aria-label={ariaLabel}
        aria-valuenow={ctx.currentAngleValue}
        aria-valuemin={ctx.angleMin}
        aria-valuemax={ctx.angleMax}
        aria-valuetext={ariaValueText}
        aria-roledescription="Color thumb"
        aria-disabled={ctx.disabled || undefined}
        data-disabled={ctx.disabled ? "" : undefined}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `rotate(${angleDeg}deg) translateY(-${radiusPercent}cqmin) translate(-50%, -50%)`,
          transformOrigin: "0 0",
          ...style,
        }}
        {...props}
      >
        {children}
      </span>
    );
  },
);

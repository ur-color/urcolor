import { forwardRef, useMemo, useEffect, type ComponentPropsWithoutRef } from "react";
import { barycentricFromChannels, barycentricToCartesian, channelLabel, formatChannelValue } from "@urcolor/shared";
import { useColorTriangleContext } from "../root/ColorTriangleRootContext";

export interface ColorTriangleThumbProps extends ComponentPropsWithoutRef<"span"> {}

export const ColorTriangleThumb = forwardRef<HTMLSpanElement, ColorTriangleThumbProps>(
  function ColorTriangleThumb({ style, children, ...props }, ref) {
    const ctx = useColorTriangleContext();

    // Register thumb element
    useEffect(() => {
      if (ref && typeof ref === "object" && ref.current) {
        ctx.thumbElement.current = ref.current;
      }
    });

    const thumbPosition = useMemo(() => {
      const { u, v, w } = barycentricFromChannels(
        { value: ctx.currentXValue, min: ctx.xMin, max: ctx.xMax },
        { value: ctx.currentYValue, min: ctx.yMin, max: ctx.yMax },
        ctx.isThreeChannel ? { value: ctx.currentZValue, min: ctx.zMin, max: ctx.zMax } : undefined,
      );

      const [v0, v1, v2] = ctx.vertices;
      const pos = barycentricToCartesian(u, v, w, v0, v1, v2);

      return {
        left: `${pos.x * 100}%`,
        top: `${pos.y * 100}%`,
      };
    }, [ctx.currentXValue, ctx.currentYValue, ctx.currentZValue, ctx.xMin, ctx.xMax, ctx.yMin, ctx.yMax, ctx.zMin, ctx.zMax, ctx.isThreeChannel, ctx.vertices]);

    const labels = useMemo(() => (
      ctx.isThreeChannel
        ? [
            channelLabel(ctx.colorSpace, ctx.xChannelKey),
            channelLabel(ctx.colorSpace, ctx.yChannelKey),
            channelLabel(ctx.colorSpace, ctx.zChannelKey ?? ""),
          ]
        : [
            channelLabel(ctx.colorSpace, ctx.xChannelKey),
            channelLabel(ctx.colorSpace, ctx.yChannelKey),
          ]
    ), [ctx.isThreeChannel, ctx.colorSpace, ctx.xChannelKey, ctx.yChannelKey, ctx.zChannelKey]);

    const ariaLabel = labels.join(", ");

    const ariaValueText = useMemo(() => {
      const valueParts = [
        `${labels[0]} ${formatChannelValue(ctx.colorSpace, ctx.xChannelKey, ctx.currentXValue)}`,
        `${labels[1]} ${formatChannelValue(ctx.colorSpace, ctx.yChannelKey, ctx.currentYValue)}`,
      ];
      if (ctx.isThreeChannel) {
        valueParts.push(`${labels[2]} ${formatChannelValue(ctx.colorSpace, ctx.zChannelKey ?? "", ctx.currentZValue)}`);
      }
      return valueParts.join(", ");
    }, [labels, ctx.colorSpace, ctx.xChannelKey, ctx.yChannelKey, ctx.zChannelKey, ctx.currentXValue, ctx.currentYValue, ctx.currentZValue, ctx.isThreeChannel]);

    return (
      <span
        ref={(el) => {
          if (el) ctx.thumbElement.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        role="slider"
        tabIndex={ctx.disabled ? undefined : 0}
        aria-label={ariaLabel}
        aria-valuenow={ctx.currentXValue}
        aria-valuemin={ctx.xMin}
        aria-valuemax={ctx.xMax}
        aria-valuetext={ariaValueText}
        aria-roledescription="Color thumb"
        aria-disabled={ctx.disabled || undefined}
        data-disabled={ctx.disabled ? "" : undefined}
        style={{
          position: "absolute",
          left: thumbPosition.left,
          top: thumbPosition.top,
          transform: "translate(-50%, -50%)",
          ...style,
        }}
        {...props}
      >
        {children}
      </span>
    );
  },
);

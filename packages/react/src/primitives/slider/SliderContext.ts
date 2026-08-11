import { createContext, useContext, type RefObject } from "react";
import type { SliderState } from "@urcolor/shared";

export interface SliderContextValue {
  /** The value in display units, plus its bounds and axis flags. */
  state: SliderState;
  /** 0-1 offset of the thumb from the track's CSS start edge. */
  position: number;
  /** True while a pointer drag is in flight. */
  dragging: boolean;
  /** Writes a new display value, ignoring no-op repeats. */
  setValue: (next: number) => void;
  /** Reports the end of an interaction. */
  commit: () => void;
  /** Flags the family while a gesture is in flight. */
  setDragging: (value: boolean) => void;
  /** The element position-to-value is measured against. */
  controlRef: RefObject<HTMLElement | null>;
}

export const SliderContext = createContext<SliderContextValue | null>(null);

export function useSliderContext(): SliderContextValue {
  const ctx = useContext(SliderContext);
  if (!ctx) throw new Error("Slider parts must be used within Slider.Root");
  return ctx;
}

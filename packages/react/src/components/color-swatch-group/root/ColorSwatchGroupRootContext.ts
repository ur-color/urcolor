import { createContext, useContext } from "react";

export type SelectionType = "single" | "multiple";

export interface ColorSwatchGroupContextValue {
  type: SelectionType;
  disabled: boolean;
}

export const ColorSwatchGroupContext = createContext<ColorSwatchGroupContextValue | null>(null);

export function useColorSwatchGroupContext() {
  const ctx = useContext(ColorSwatchGroupContext);
  if (!ctx) throw new Error("ColorSwatchGroupItem must be used within ColorSwatchGroupRoot");
  return ctx;
}

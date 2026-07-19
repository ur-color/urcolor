import { createContext, useContext } from "react";

export interface ColorFieldContextValue {
  modelValue: number | undefined;
  displayValue: string;
  disabled: boolean;
  readOnly: boolean;
  isDecreaseDisabled: boolean;
  isIncreaseDisabled: boolean;
  handleIncrease: (multiplier?: number) => void;
  handleDecrease: (multiplier?: number) => void;
  handleMinMaxValue: (type: "min" | "max") => void;
  commitValue: (val: number | undefined) => void;
  onInputChange: (text: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  format: "number" | "degree" | "percentage" | "hex";
}

export const ColorFieldContext = createContext<ColorFieldContextValue | null>(null);

export function useColorFieldContext() {
  const ctx = useContext(ColorFieldContext);
  if (!ctx) throw new Error("ColorField.* must be used within ColorFieldRoot");
  return ctx;
}

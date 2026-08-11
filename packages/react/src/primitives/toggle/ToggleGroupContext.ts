import { createContext, useContext } from "react";

export type SelectionType = "single" | "multiple";

export interface ToggleGroupContextValue {
  type: SelectionType;
  disabled: boolean;
  isSelected: (value: string) => boolean;
  toggle: (value: string) => void;
}

export const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(null);

/** Null outside a group: a standalone Toggle owns its own state. */
export function useToggleGroupContext(): ToggleGroupContextValue | null {
  return useContext(ToggleGroupContext);
}

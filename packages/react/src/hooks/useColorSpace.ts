import { useCallback, useMemo } from "react";
import { colorSpaces, culoriToDisplay, displayToCulori } from "@urcolor/core";
import { useColor, type ColorInput, type UseColorReturn } from "./useColor";

export type UseColorSpaceReturn<K extends string> = UseColorReturn & {
  [P in K]: number;
} & {
  [P in K as `set${Capitalize<P>}`]: (value: number) => void;
};

export function useColorSpace(input: ColorInput, spaceName: string) {
  const { color, setColor, hex, setHex, alpha, setAlpha } = useColor(input);
  const spaceConfig = colorSpaces[spaceName];

  const channels = useMemo(() => {
    if (!spaceConfig) return {};
    const result: Record<string, number> = {};
    for (const ch of spaceConfig.channels) {
      const converted = color.to(spaceConfig.mode);
      if (!converted) {
        result[ch.key] = 0;
        continue;
      }
      const raw = converted.get(ch.key, 0);
      result[ch.key] = culoriToDisplay(ch, raw);
    }
    return result;
  }, [color, spaceConfig]);

  const setters = useMemo(() => {
    if (!spaceConfig) return {};
    const result: Record<string, (value: number) => void> = {};
    for (const ch of spaceConfig.channels) {
      const capitalizedKey = ch.key.charAt(0).toUpperCase() + ch.key.slice(1);
      result[`set${capitalizedKey}`] = (value: number) => {
        const culoriVal = displayToCulori(ch, value);
        setColor(color.set({
          mode: spaceConfig.mode,
          [ch.key]: culoriVal,
        }));
      };
    }
    return result;
  }, [color, spaceConfig, setColor]);

  return { color, setColor, hex, setHex, alpha, setAlpha, ...channels, ...setters };
}

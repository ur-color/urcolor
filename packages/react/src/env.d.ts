declare module 'culori/fn' {
  type CuloriColor = {
    mode: string;
    alpha?: number;
    [channel: string]: number | string | undefined;
  };

  type ModeDefinition = {
    mode: string;
    channels: string[];
    [key: string]: unknown;
  };

  export function useMode(definition: ModeDefinition): (color: CuloriColor | string) => CuloriColor;
  export function getMode(mode: string): ModeDefinition;
  export function useParser(parser: unknown, mode?: string): void;
  export function removeParser(parser: unknown): void;

  export function parse(color: string | CuloriColor | undefined): CuloriColor | undefined;
  export function converter(mode?: string): (color: CuloriColor | string | undefined) => CuloriColor | undefined;

  export function formatHex(color: CuloriColor | string | undefined): string | undefined;
  export function formatHex8(color: CuloriColor | string | undefined): string | undefined;
  export function formatRgb(color: CuloriColor | string | undefined): string | undefined;
  export function formatHsl(color: CuloriColor | string | undefined): string | undefined;
  export function formatCss(color: CuloriColor | string | undefined): string | undefined;
  export function serializeHex(color: CuloriColor): string;
  export function serializeHex8(color: CuloriColor): string;
  export function serializeRgb(color: CuloriColor): string;
  export function serializeHsl(color: CuloriColor): string;

  export function differenceEuclidean(
    mode?: string,
    weights?: number[],
  ): (color1: CuloriColor, color2: CuloriColor) => number;
  export function differenceCie76(): (c1: CuloriColor, c2: CuloriColor) => number;
  export function differenceCie94(kL?: number, K1?: number, K2?: number): (c1: CuloriColor, c2: CuloriColor) => number;
  export function differenceCiede2000(Kl?: number, Kc?: number, Kh?: number): (c1: CuloriColor, c2: CuloriColor) => number;
  export function differenceCmc(l?: number, c?: number): (c1: CuloriColor, c2: CuloriColor) => number;

  export function displayable(color: CuloriColor | string | undefined): boolean;
  export function inGamut(mode?: string): (color: CuloriColor | string | undefined) => boolean;
  export function clampRgb(color: CuloriColor | string | undefined): CuloriColor | undefined;
  export function clampChroma(color: CuloriColor | string | undefined, mode?: string, rgbGamut?: string): CuloriColor | undefined;
  export function clampGamut(mode?: string): (color: CuloriColor | string | undefined) => CuloriColor | undefined;
  export function toGamut(dest?: string, mode?: string, delta?: ((c1: CuloriColor, c2: CuloriColor) => number) | null, jnd?: number): (color: CuloriColor | string | undefined) => CuloriColor | undefined;

  export function interpolate(colors: (CuloriColor | string)[], mode?: string, overrides?: Record<string, unknown>): (t: number) => CuloriColor;
  export function interpolateWith(premap: unknown, postmap: unknown): typeof interpolate;
  export function interpolateWithPremultipliedAlpha(colors: (CuloriColor | string)[], mode?: string, overrides?: Record<string, unknown>): (t: number) => CuloriColor;

  export function nearest(colors: CuloriColor[], differenceFn: (c1: CuloriColor, c2: CuloriColor) => number): (color: CuloriColor | string, n?: number) => CuloriColor[];

  export function round(n: number): (value: number) => number;
  export function average(colors: (CuloriColor | string)[], mode?: string, overrides?: Record<string, unknown>): CuloriColor;

  export function wcagLuminance(color: CuloriColor | string | undefined): number;
  export function wcagContrast(color1: CuloriColor | string | undefined, color2: CuloriColor | string | undefined): number;

  export const colorsNamed: Record<string, number>;

  // Mode definitions
  export const modeA98: ModeDefinition;
  export const modeCubehelix: ModeDefinition;
  export const modeDlab: ModeDefinition;
  export const modeDlch: ModeDefinition;
  export const modeHsi: ModeDefinition;
  export const modeHsl: ModeDefinition;
  export const modeHsv: ModeDefinition;
  export const modeHwb: ModeDefinition;
  export const modeItp: ModeDefinition;
  export const modeJab: ModeDefinition;
  export const modeJch: ModeDefinition;
  export const modeLab: ModeDefinition;
  export const modeLab65: ModeDefinition;
  export const modeLch: ModeDefinition;
  export const modeLch65: ModeDefinition;
  export const modeLchuv: ModeDefinition;
  export const modeLrgb: ModeDefinition;
  export const modeLuv: ModeDefinition;
  export const modeOkhsl: ModeDefinition;
  export const modeOkhsv: ModeDefinition;
  export const modeOklab: ModeDefinition;
  export const modeOklch: ModeDefinition;
  export const modeP3: ModeDefinition;
  export const modeProphoto: ModeDefinition;
  export const modeRec2020: ModeDefinition;
  export const modeRgb: ModeDefinition;
  export const modeXyb: ModeDefinition;
  export const modeXyz50: ModeDefinition;
  export const modeXyz65: ModeDefinition;
  export const modeYiq: ModeDefinition;
}

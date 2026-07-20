// Multilingual color naming and channel-label translations for urcolor.

// Channel labels.
export { ChannelNames, type ChannelKey } from "./channel-names";
export { translations, type ChannelTranslations } from "./channels";

// Colour-name sources.
import { registerSource } from "./engine/registry";
import { uwdataSource } from "./sources/uwdata/source";
import { uwdataChunks } from "./sources/uwdata/chunks";

registerSource(uwdataSource, uwdataChunks);

export { listSources, getSource } from "./engine/registry";
export type { LanguageCoverage, NameSource } from "./engine/types";

// Colour-name lookup.
export { ColorNames } from "./color-names";
export type {
  ColorNameResolution,
  ColorNamesOptions,
  ResolvedColorNamesOptions,
} from "./color-names";
export type { Candidate } from "./engine/lookup-full";

// Multilingual color naming and channel-label translations for urcolor.

// Channel labels.
export { ChannelNames, type ChannelKey } from "./channel-names";
export { translations, type ChannelTranslations } from "./channels";

// Colour-name sources.
import { registerSource, setDefaultSources } from "./engine/registry";
import { uwdataSource } from "./sources/uwdata/source";
import { uwdataChunks } from "./sources/uwdata/chunks";
import { wikidataSource } from "./sources/wikidata/source";
import { wikidataChunks } from "./sources/wikidata/chunks";
import { ralSource } from "./sources/ral/source";
import { ralChunks } from "./sources/ral/chunks";

registerSource(uwdataSource, uwdataChunks);
registerSource(wikidataSource, wikidataChunks);
registerSource(ralSource, ralChunks);

// uwdata answers the locales it covers; wikidata answers the rest. Order
// matters and lives here rather than in the lookup layer, which never names a
// dataset.
//
// The catalogue sources are registered but deliberately absent from this
// chain: their names are industrial codes, so a plain resolve() must answer
// with a word, never with "ral 6018". Callers opt in with { source: "ral" }.
setDefaultSources(["uwdata", "wikidata"]);

export { listSources, getSource, getDefaultSources } from "./engine/registry";
export type { LanguageCoverage, NameSource } from "./engine/types";

// Colour-name lookup.
export { ColorNames } from "./color-names";
export type {
  ColorNameResolution,
  ColorNamesOptions,
  ResolvedColorNamesOptions,
} from "./color-names";
export type { Candidate } from "./engine/lookup-full";

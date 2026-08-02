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

registerSource(uwdataSource, uwdataChunks);
registerSource(wikidataSource, wikidataChunks);

// uwdata answers the 20 locales it covers; wikidata answers the other 278.
// Order matters and lives here rather than in the lookup layer, which never
// names a dataset. Adding a third source later is a one-line change.
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

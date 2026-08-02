import type { NameSource } from "../../engine/types";
import meta from "../../data/wikidata/meta.json";

/** Catalogue size the shipped coverage figures were computed against. */
export const WIKIDATA_ITEM_COUNT = meta.itemCount;

export const wikidataSource: NameSource = {
  id: "wikidata",
  title: "Wikidata",
  url: "https://www.wikidata.org/",
  retrievedAt: meta.retrievedAt,
  license: "CC0-1.0",
  citation:
    "Wikidata contributors. Wikidata, the free knowledge base. "
    + "https://www.wikidata.org/ — content available under CC0 1.0.",
  disclaimer:
    "Names are editorial labels contributed by Wikidata editors, not measured "
    + "naming behaviour. Coverage is uneven across languages, and a name's "
    + "presence does not imply it is the term speakers would actually choose.",
  languages: meta.languages as NameSource["languages"],
};

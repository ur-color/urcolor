import type { NameSource } from "../../engine/types";
import meta from "../../data/ral/meta.json";

export const ralSource: NameSource = {
  id: "ral",
  title: "RAL Classic colour codes",
  url: "https://github.com/ieskudero/ral-colors",
  retrievedAt: meta.retrievedAt,
  license: "MIT",
  languageNeutral: true,
  citation: "RAL Classic codes and sRGB values from ieskudero/ral-colors, MIT licensed.",
  disclaimer:
    "RAL is a trademark of RAL gGmbH. This source ships factual colour values "
    + "keyed by RAL Classic code, not the RAL system itself, and is neither "
    + "affiliated with nor endorsed by RAL gGmbH. RAL publishes no "
    + "authoritative sRGB renderings, so these are approximations matching "
    + "Wikipedia's List of RAL colours; another convention circulates and "
    + "differs materially for some codes. RAL Design and RAL Effect are not "
    + "included.",
  languages: meta.languages as NameSource["languages"],
};

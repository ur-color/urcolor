import type { NameSource } from "../../engine/types";
import meta from "../../data/pantone/meta.json";

export const pantoneSource: NameSource = {
  id: "pantone",
  title: "Pantone Fashion, Home + Interiors colours",
  url: "https://github.com/Margaret2/pantone-colors",
  retrievedAt: meta.retrievedAt,
  license:
    "No licence declared upstream, and the names are claimed as Pantone "
    + "copyright. See the package README before redistributing.",
  languageNeutral: true,
  citation:
    "Pantone Fashion, Home + Interiors (TCX/TPG) numbers, names and sRGB "
    + "values from Margaret2/pantone-colors.",
  disclaimer:
    "PANTONE is a trademark of Pantone LLC, and this package is neither "
    + "affiliated with nor endorsed by Pantone LLC. Upstream declares no "
    + "licence and states that the colour names are Pantone copyright while "
    + "the hex values are published freely; make your own assessment before "
    + "redistributing. This is the Fashion, Home + Interiors collection, not "
    + "the Pantone Matching System, so it answers to TCX numbers such as "
    + "19-4052 and not to PMS codes such as 448 C.",
  languages: meta.languages as NameSource["languages"],
};

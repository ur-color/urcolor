import type { NameSource } from "../../engine/types";

export const UWDATA_COMMIT = "f0d3e30db9e4b2c3b703bde0d816043eb48a6cb5";

export const uwdataSource: NameSource = {
  id: "uwdata",
  title: "Color Naming in Different Languages",
  url: "https://github.com/uwdata/color-naming-in-different-languages",
  commitSha: UWDATA_COMMIT,
  license: "No license declared upstream. See the package README before redistributing.",
  citation:
    "Kim, Y., Thayer, K., Silva Gorsky, G., & Heer, J. (2019). Color Names Across Languages: "
    + "Salient Colors and Term Translation in Multilingual Color Naming Models. EuroVis.",
  disclaimer:
    "We represent the color labels provided by the participants in our study, which may include "
    + "misspellings, but also whatever racial biases they have (e.g., the color 'skin'). This is "
    + "not meant to be a prescriptive definition of what colors fit what labels.",
  languages: {},
};

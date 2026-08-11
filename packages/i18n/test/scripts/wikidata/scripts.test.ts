import { describe, expect, it } from "bun:test";
import {
  attestedScripts,
  isScriptConsistent,
  scriptsOf,
  unlistedScriptLetters,
} from "../../../scripts/sync-wikidata/scripts";

describe("scriptsOf", () => {
  it("names the scripts a string is written in", () => {
    expect([...scriptsOf("красный")]).toEqual(["Cyrillic"]);
    expect([...scriptsOf("Eigengrau")]).toEqual(["Latin"]);
    expect([...scriptsOf("ピンク")]).toEqual(["Katakana"]);
    expect([...scriptsOf("rосмический")].sort()).toEqual(["Cyrillic", "Latin"]);
  });

  it("ignores digits, spaces and punctuation", () => {
    expect([...scriptsOf("RAL 1005")]).toEqual(["Latin"]);
    expect([...scriptsOf("448")]).toEqual([]);
  });

  it("ignores letters whose script is Common, such as the okina", () => {
    // U+02BB is category Lm with script Common. A naive letter test reads it
    // as foreign to Latin and drops legitimate Hawaiian and Uzbek names.
    expect([...scriptsOf("ʻulaʻula")]).toEqual(["Latin"]);
    expect([...scriptsOf("koʻk")]).toEqual(["Latin"]);
  });
});

describe("attestedScripts", () => {
  it("requires a script in at least three terms", () => {
    const names = ["rot", "grün", "blau", "gelb", "weiß", "Eigengrau", "umber"];
    expect([...attestedScripts(names)]).toEqual(["Latin"]);
  });

  it("admits a second script a locale genuinely uses", () => {
    // Japanese is tri-script. Katakana in 4 of 10 clears both the floor of 3
    // and the 5% share, so katakana names are not foreign to Japanese. This is
    // the case that rules out a simple majority-script rule, which would drop
    // 110 legitimate Japanese terms.
    const names = [
      "黄色", "灰色", "水色", "空色", "紅色", "茶色",
      "ピンク", "シアン", "マゼンタ", "ベージュ",
    ];
    expect([...attestedScripts(names)].sort()).toEqual(["Han", "Katakana"]);
  });

  it("does not admit a script attested below the floor", () => {
    const names = [...Array(40).keys()].map(() => "красный").concat(["Eigengrau", "umber"]);
    expect([...attestedScripts(names)]).toEqual(["Cyrillic"]);
  });

  it("returns nothing for a chunk too thin to calibrate", () => {
    // A two-term chunk cannot tell a foreign name from its own orthography.
    expect([...attestedScripts(["Lotong", "ᨌᨛᨒ"])]).toEqual([]);
  });
});

describe("isScriptConsistent", () => {
  const cyrillic = new Set(["Cyrillic"]);

  it("keeps a term written wholly in an allowed script", () => {
    expect(isScriptConsistent("красный", cyrillic)).toBe(true);
  });

  it("drops a term written wholly in a foreign script", () => {
    expect(isScriptConsistent("Eigengrau", cyrillic)).toBe(false);
    expect(isScriptConsistent("International Klein Blue", cyrillic)).toBe(false);
  });

  it("drops a mixed-script typo", () => {
    // A Latin r opening a Cyrillic word, a Latin o inside one, a Latin C
    // starting one. Homoglyph repair is not attempted: r is a keyboard slip
    // for к, not a homoglyph of it, so every fault drops instead.
    expect(isScriptConsistent("rосмический латте", cyrillic)).toBe(false);
    expect(isScriptConsistent("полноќнoсина", cyrillic)).toBe(false);
    expect(isScriptConsistent("Cиньо-зелен", cyrillic)).toBe(false);
  });

  it("ignores digits and punctuation", () => {
    expect(isScriptConsistent("сине-зелёный (2)", cyrillic)).toBe(true);
  });

  it("keeps everything when nothing is attested", () => {
    expect(isScriptConsistent("Lotong", new Set())).toBe(true);
  });
});

describe("unlistedScriptLetters", () => {
  it("counts nothing for scripts the table covers", () => {
    expect(unlistedScriptLetters("красный")).toBe(0);
    expect(unlistedScriptLetters("ʻulaʻula")).toBe(0);
    expect(unlistedScriptLetters("448 C")).toBe(0);
    expect(unlistedScriptLetters("ყვითელი")).toBe(0); // Georgian
    expect(unlistedScriptLetters("ᨌᨛᨒ")).toBe(0); // Buginese
    expect(unlistedScriptLetters("ꠗꠟꠣ")).toBe(0); // Syloti Nagri
    expect(unlistedScriptLetters("ꯑꯉꯥꯡꯕ")).toBe(0); // Meetei Mayek
    expect(unlistedScriptLetters("ܣܘܡܩܐ")).toBe(0); // Syriac
  });

  it("counts a letter in a script the table omits", () => {
    // Deseret is a real script and deliberately absent from CHECKED_SCRIPTS.
    // The check skips such a letter rather than dropping its term, and this
    // is the number that makes the blind spot visible in the sync report.
    expect(unlistedScriptLetters("𐐒")).toBe(1);
  });
});

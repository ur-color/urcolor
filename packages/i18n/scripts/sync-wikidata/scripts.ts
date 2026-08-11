/**
 * Script consistency for shipped colour names.
 *
 * Wikidata labels are contributed per language and occasionally land in the
 * wrong one: `Eigengrau` sits in the Russian chunk, `umber` in Cyrillic
 * Serbian. A second fault is the single-character typo, where `rосмический
 * латте` opens with a Latin `r` and `Cиньо-зелен` with a Latin `C`. One rule
 * catches both.
 *
 * The valid scripts for a locale are derived from that locale's own terms
 * rather than from CLDR. `Intl.Locale.prototype.maximize()` was measured and
 * rejected: it maximises `grc` to Cypriot, `lad` to Hebrew and `crh` to
 * Cyrillic, all contradicted by the actual labels, and returns nothing at all
 * for nine of the tags in this data.
 */

/**
 * Every script present in the shipped data, plus headroom.
 *
 * JavaScript has no script-of-character API, so the check tests against this
 * enumerated list. A character in a script missing from it matches nothing and
 * is treated as ignorable, which fails **open**: an unlisted script never
 * causes a wrong drop, it causes a skipped check. {@link unlistedScriptLetters}
 * exists so the sync report can surface that gap as a number rather than as
 * silence.
 */
export const CHECKED_SCRIPTS: readonly string[] = [
  "Latin", "Cyrillic", "Greek", "Arabic", "Hebrew", "Han", "Hiragana", "Katakana",
  "Hangul", "Devanagari", "Bengali", "Tamil", "Telugu", "Kannada", "Malayalam",
  "Gujarati", "Gurmukhi", "Oriya", "Sinhala", "Thai", "Lao", "Myanmar", "Khmer",
  "Georgian", "Armenian", "Ethiopic", "Cherokee", "Syriac", "Thaana", "Tibetan",
  "Mongolian", "Meetei_Mayek", "Syloti_Nagri", "Buginese", "Tifinagh",
  "Canadian_Aboriginal", "Javanese", "Balinese", "Yi", "Vai", "Adlam", "Nko",
  "Osage", "Coptic", "Runic", "Gothic", "Cypriot",
  // Added after the first sync reported 79 letters in no listed script:
  // Tai Tham carries Northern Thai (`nod`) and Ol Chiki carries Santali
  // (`sat`). Both were being skipped rather than checked, which is exactly
  // the gap `unlistedScriptLetters` exists to expose.
  "Tai_Tham", "Ol_Chiki",
];

const SCRIPT_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = CHECKED_SCRIPTS.map(
  name => [name, new RegExp(`\\p{Script_Extensions=${name}}`, "u")] as const,
);

const LETTER = /\p{L}/u;

/**
 * Script-neutral letters. The ʻokina (U+02BB) is the case that matters: it is
 * category `Lm` with script Common, so a naive letter test reads it as foreign
 * to Latin and drops Hawaiian `ʻulaʻula` and Uzbek `koʻk`.
 */
const IGNORED = /[\p{Script_Extensions=Common}\p{Script_Extensions=Inherited}]/u;

function scriptOf(char: string): string | undefined {
  for (const [name, pattern] of SCRIPT_PATTERNS) {
    if (pattern.test(char)) return name;
  }
  return undefined;
}

/** The scripts a string's letters are written in, ignoring neutral characters. */
export function scriptsOf(text: string): Set<string> {
  const found = new Set<string>();
  for (const char of text) {
    if (!LETTER.test(char) || IGNORED.test(char)) continue;
    const script = scriptOf(char);
    if (script !== undefined) found.add(script);
  }
  return found;
}

/** Letters in no listed script, so the report can show the table's blind spot. */
export function unlistedScriptLetters(text: string): number {
  let count = 0;
  for (const char of text) {
    if (!LETTER.test(char) || IGNORED.test(char)) continue;
    if (scriptOf(char) === undefined) count++;
  }
  return count;
}

/**
 * The scripts valid for a locale: those attested in at least
 * `max(3, 5% of terms)` of its own names.
 *
 * The floor and the share both matter. The share admits katakana for Japanese,
 * attested in 40% of its terms, while rejecting Latin for Russian, attested in
 * 3 terms of 197. The floor of 3 stops one stray name in a small chunk from
 * authorising its own script. A floor of 4 was measured and rejected: it drops
 * Chechen `Iаьржа` and `кiайн`, where Latin letters stand in for the palochka
 * by ordinary convention.
 *
 * An empty result means the chunk is too thin to calibrate, and callers ship
 * it unchecked. A three-term chunk cannot tell a foreign name from its own
 * orthography.
 */
export function attestedScripts(names: readonly string[]): Set<string> {
  const tally = new Map<string, number>();
  for (const name of names) {
    for (const script of scriptsOf(name)) {
      tally.set(script, (tally.get(script) ?? 0) + 1);
    }
  }

  const floor = Math.max(3, names.length * 0.05);
  const attested = new Set<string>();
  for (const [script, count] of tally) {
    if (count >= floor) attested.add(script);
  }
  return attested;
}

/** Whether every letter of a name falls in an allowed script. */
export function isScriptConsistent(name: string, allowed: ReadonlySet<string>): boolean {
  if (allowed.size === 0) return true;
  for (const script of scriptsOf(name)) {
    if (!allowed.has(script)) return false;
  }
  return true;
}

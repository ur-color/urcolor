import { Color } from "@urcolor/core";
import type { PaletteChunk, TermEntry } from "../../src/engine/types";
import type { PantoneRow } from "./fetch";

/**
 * Pantone names are the same string in every language, so this source ships
 * one chunk under the language-neutral `und` tag rather than pretending the
 * names are English.
 */
export const NEUTRAL_LOCALE = "und";

/**
 * The display name carries the `pantone` prefix so it is unambiguous about
 * which catalogue it comes from, and spells the name with spaces rather than
 * upstream's hyphens: `pantone classic blue`.
 *
 * Three aliases point at each entry, so a caller can reach it by whichever
 * form they hold: the TCX number (`19-4052`), the bare spaced name
 * (`classic blue`), and upstream's hyphenated slug (`classic-blue`).
 *
 * Names are not unique across the collection, and the TCX number is the real
 * identifier. A repeated name therefore keeps its first entry for the name
 * aliases while every entry keeps its own number alias, so no colour becomes
 * unreachable.
 */
export function buildPantoneChunk(rows: readonly PantoneRow[]): PaletteChunk {
  const terms: TermEntry[] = [];
  const provenance: [string, string][] = [];
  const aliases: Record<string, number> = {};

  for (const row of rows) {
    // Names and codes are ASCII, so the invariant fold is the correct one
    // here: no locale's rules could apply to a catalogue entry.
    const slug = row.slug.normalize("NFC").toLowerCase();
    const spaced = slug.replace(/-+/g, " ");
    const code = row.code.normalize("NFC").toLowerCase();
    const [l, a, b] = Color.parse(`#${row.hex}`)!.to("oklab").coords;

    const index = terms.length;
    aliases[code] = index;
    if (!(spaced in aliases)) aliases[spaced] = index;
    if (!(slug in aliases)) aliases[slug] = index;

    provenance.push([row.code, row.hex]);
    terms.push([`pantone ${spaced}`, `pantone ${spaced}`, [l, a, b], null]);
  }

  return { lang: NEUTRAL_LOCALE, model: "palette", terms, provenance, aliases };
}

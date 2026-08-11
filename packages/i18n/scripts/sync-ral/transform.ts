import { Color } from "@urcolor/core";
import type { PaletteChunk, TermEntry } from "../../src/engine/types";
import type { RalRow } from "./fetch";

/** RAL codes are the same string in every language. See scripts/sync-pantone. */
export const NEUTRAL_LOCALE = "und";

/**
 * The display name is the code, which is what keeps this source honest about
 * being a catalogue. Upstream's English description is kept as an alias, so
 * `colorOf("traffic red")` resolves without implying the chunk is English.
 */
export function buildRalChunk(rows: readonly RalRow[]): PaletteChunk {
  const terms: TermEntry[] = [];
  const provenance: [string, string][] = [];
  const aliases: Record<string, number> = {};

  for (const row of rows) {
    // Codes are ASCII, so the invariant fold is the correct one here: no
    // locale's rules could apply to a catalogue number.
    const code = row.code.normalize("NFC").toLowerCase();
    if (code in aliases) continue;

    const name = `ral ${code}`;
    const [l, a, b] = Color.parse(`#${row.hex}`)!.to("oklab").coords;

    aliases[code] = terms.length;
    // Two RAL codes can share a description; first wins, matching the code
    // rule above so both alias kinds resolve the same way.
    const description = row.description.normalize("NFC").toLowerCase();
    if (!(description in aliases)) aliases[description] = terms.length;

    provenance.push([row.code, row.hex]);
    terms.push([name, name, [l, a, b], null]);
  }

  return { lang: NEUTRAL_LOCALE, model: "palette", terms, provenance, aliases };
}

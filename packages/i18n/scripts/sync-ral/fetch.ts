/** Raised when the upstream module no longer matches what the parser expects. */
export class RalSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RalSchemaError";
  }
}

/**
 * ieskudero/ral-colors, MIT licensed.
 *
 * RAL publishes no authoritative sRGB renderings, so two conventions circulate.
 * This one matches Wikipedia's "List of RAL colours" table exactly (RAL 1000
 * `#CDBA88`, 3020 `#C1121C`, 5015 `#2874B2`, 6018 `#48A43F`, 9005 `#0A0A0D`),
 * which is the more widely cited of the two and is internally consistent
 * across all 213 codes. juliuste/ral-to-hex, also MIT, follows the other
 * convention and carries no names.
 */
export const RAL_CLASSIC_URL
  = "https://raw.githubusercontent.com/ieskudero/ral-colors/master/RAL/classic.js";

/** RAL Classic has 213 entries. Fewer means the parse or the upstream broke. */
export const EXPECTED_CLASSIC_ROWS = 213;

export interface RalRow {
  /** Four-digit RAL Classic number, without the `RAL` prefix. */
  code: string;
  /** Upstream's English name, e.g. `Green beige`. */
  description: string;
  /** Six hex digits, no leading `#`. */
  hex: string;
}

/**
 * Upstream ships an ES module rather than JSON, so this reads its text.
 * Evaluating it is deliberately not an option: running remote JavaScript in a
 * build script is not an acceptable trade for the convenience. The row-count
 * floor is what catches an upstream reformat this regex would otherwise
 * silently under-match.
 */
const ENTRY_PATTERN
  = /RAL(\d{4})\s*:\s*\{\s*description\s*:\s*'([^']+)'\s*,\s*HEX\s*:\s*'#([0-9a-fA-F]{6})'/g;

export function parseRalClassic(source: string, expected = EXPECTED_CLASSIC_ROWS): RalRow[] {
  const rows: RalRow[] = [];
  for (const match of source.matchAll(ENTRY_PATTERN)) {
    rows.push({ code: match[1]!, description: match[2]!.trim(), hex: match[3]!.toUpperCase() });
  }

  if (rows.length < expected) {
    throw new RalSchemaError(
      `RAL upstream yielded ${rows.length} entries, below the expected ${expected}. `
      + "The module's formatting has probably changed; check ENTRY_PATTERN.",
    );
  }
  return rows;
}

export async function fetchRalClassic(fetchImpl: typeof fetch = fetch): Promise<RalRow[]> {
  const response = await fetchImpl(RAL_CLASSIC_URL);
  if (!response.ok) {
    throw new RalSchemaError(`RAL fetch failed: HTTP ${response.status}`);
  }
  return parseRalClassic(await response.text());
}

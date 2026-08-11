/** Raised when the upstream JSON no longer matches what the transform expects. */
export class PantoneSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PantoneSchemaError";
  }
}

/**
 * Margaret2/pantone-colors, the Fashion, Home + Interiors collection (TCX/TPG),
 * 2,310 colours keyed by TCX number and carrying Pantone's own name for each.
 *
 * It is used despite carrying no licence file, which is a deliberate decision
 * recorded in `src/sources/pantone/source.ts`'s disclaimer: upstream's README
 * states that the names are Pantone copyright while the hex values are
 * published freely on pantone.com.
 *
 * The obvious MIT-licensed alternative, adonald/Pantone-CMYK-RGB-Hex, was
 * measured and rejected. Its values are a naive CMYK to RGB conversion rather
 * than Pantone's published sRGB renderings, and are wrong throughout: 185 as
 * `#FF173D` against a published `#E4002B`, 354 as `#33FF1A` against `#00B140`,
 * Black as `#050403` against `#2D2926`. This source's values were spot-checked
 * against published figures and match exactly.
 */
export const PANTONE_URL
  = "https://raw.githubusercontent.com/Margaret2/pantone-colors/master/pantone-numbers.json";

/** Below this, assume the fetch or the upstream file is broken rather than shrunk. */
export const MIN_EXPECTED_ROWS = 2000;

export interface PantoneRow {
  /** TCX number, e.g. `11-0103`. */
  code: string;
  /** Pantone's name, hyphenated exactly as upstream stores it, e.g. `classic-blue`. */
  slug: string;
  /** Six hex digits, no leading `#`. */
  hex: string;
}

const CODE_PATTERN = /^\d{2}-\d{4}(\s+TC[XG])?$/i;
const HEX_PATTERN = /^#?([0-9a-fA-F]{6})$/;

export function parsePantone(json: string): PantoneRow[] {
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new PantoneSchemaError("Upstream Pantone data is not an object keyed by TCX number.");
  }

  return Object.entries(parsed as Record<string, unknown>).map(([code, value]) => {
    if (!CODE_PATTERN.test(code)) {
      throw new PantoneSchemaError(`Pantone key "${code}" is not a TCX number.`);
    }
    if (typeof value !== "object" || value === null) {
      throw new PantoneSchemaError(`Pantone entry ${code} is not an object.`);
    }
    const row = value as Record<string, unknown>;

    const slug = row.name;
    if (typeof slug !== "string" || slug.trim().length === 0) {
      throw new PantoneSchemaError(`Pantone entry ${code} has no usable name.`);
    }

    const hex = row.hex;
    if (typeof hex !== "string") {
      throw new PantoneSchemaError(`Pantone entry ${code} has no hex.`);
    }
    const match = HEX_PATTERN.exec(hex.trim());
    if (match === null) {
      throw new PantoneSchemaError(`Pantone entry ${code} has a malformed hex "${hex}".`);
    }

    return { code, slug: slug.trim(), hex: match[1]!.toUpperCase() };
  });
}

export async function fetchPantone(fetchImpl: typeof fetch = fetch): Promise<PantoneRow[]> {
  const response = await fetchImpl(PANTONE_URL);
  if (!response.ok) {
    throw new PantoneSchemaError(`Pantone fetch failed: HTTP ${response.status}`);
  }

  const rows = parsePantone(await response.text());
  if (rows.length < MIN_EXPECTED_ROWS) {
    throw new PantoneSchemaError(
      `Pantone upstream returned ${rows.length} rows, below the ${MIN_EXPECTED_ROWS} floor.`,
    );
  }
  return rows;
}

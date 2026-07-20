import { UWDATA_COMMIT } from "../../src/sources/uwdata/source";

/**
 * Raised when upstream's shape no longer matches what the transform expects,
 * or when a download itself fails. `status` is set only for HTTP failures
 * (see {@link download}), letting callers distinguish "legitimately absent"
 * (404) from real problems (network errors, 5xx, schema drift).
 */
export class SchemaError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "SchemaError";
    this.status = status;
  }
}

export interface RawFullRecord {
  langAbv: string;
  term: string;
  commonTerm: string;
  binL: number;
  binA: number;
  binB: number;
  pTC: number;
  /** Probability the *colour* is named this *term* ("P(colour|term)"). */
  pCT: number;
}

export interface RawHueTerm {
  simplifiedName: string;
  commonName: string;
  /**
   * `pCT` is `NaN` when upstream's bin object doesn't carry it — treated the
   * same way as the CSV's blank centroid cells (see {@link optionalFinite}):
   * a legitimate "no signal" rather than schema drift.
   */
  bins: { pTC: number; pCT: number }[];
}

export interface RawBasicRow {
  lang_abv: string;
  commonName: string;
  simplifiedName: string;
  /** `NaN` when upstream left the cell blank (no full-colour centroid computed for this term). */
  avgFullL: number;
  /** `NaN` when upstream left the cell blank (no full-colour centroid computed for this term). */
  avgFullA: number;
  /** `NaN` when upstream left the cell blank (no full-colour centroid computed for this term). */
  avgFullB: number;
}

const BASE = "https://raw.githubusercontent.com/uwdata/color-naming-in-different-languages";

/**
 * `commitSha` defaults to the committed pin so existing callers (and the
 * tests that pin this default) are unaffected. A caller doing a `--ref`
 * sync passes the SHA that {@link resolveRef} resolved that ref to.
 */
export function upstreamUrl(path: string, commitSha: string = UWDATA_COMMIT): string {
  return `${BASE}/${commitSha}/${path}`;
}

export async function download(path: string, commitSha: string = UWDATA_COMMIT): Promise<string> {
  const url = upstreamUrl(path, commitSha);
  const response = await fetch(url);
  if (!response.ok) {
    throw new SchemaError(`Failed to download ${url}: HTTP ${response.status}`, response.status);
  }
  return response.text();
}

function requireObject(value: unknown, where: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new SchemaError(
      `Upstream schema drift in ${where}: expected an object, got ${JSON.stringify(value)}.`,
    );
  }
  return value as Record<string, unknown>;
}

function requireKeys(record: Record<string, unknown>, keys: string[], where: string): void {
  const missing = keys.filter(key => record[key] === undefined);
  if (missing.length > 0) {
    throw new SchemaError(
      `Upstream schema drift in ${where}: missing ${missing.join(", ")}. `
      + `Present keys: ${Object.keys(record).join(", ")}`,
    );
  }
}

function requireString(value: unknown, where: string, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new SchemaError(
      `Upstream schema drift in ${where}: ${field} must be a non-empty string, got ${JSON.stringify(value)}.`,
    );
  }
  return value;
}

function requireFinite(value: unknown, where: string, field: string): number {
  const isUsable = typeof value === "number" || (typeof value === "string" && value.trim().length > 0);
  const parsed = isUsable ? Number(value) : NaN;
  if (!isUsable || !Number.isFinite(parsed)) {
    throw new SchemaError(
      `Upstream schema drift in ${where}: ${field} must be a finite number, got ${JSON.stringify(value)}.`,
    );
  }
  return parsed;
}

/**
 * Like {@link requireFinite}, but a blank cell is a legitimate "no centroid
 * computed for this term" rather than schema drift: upstream leaves
 * `avgFullL`/`avgFullA`/`avgFullB` empty for terms with too few full-colour
 * samples to average. Any *non*-blank, non-numeric value (e.g. `"N/A"`)
 * still throws — that would be real drift.
 */
function optionalFinite(value: unknown, where: string, field: string): number {
  if (value === undefined || (typeof value === "string" && value.trim().length === 0)) return NaN;
  return requireFinite(value, where, field);
}

export function parseFullBinned(json: string): RawFullRecord[] {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    throw new SchemaError("Upstream schema drift in full_color_names_binned: expected an array.");
  }

  return parsed.map((raw, index) => {
    const where = `full_color_names_binned[${index}]`;
    const record = requireObject(raw, where);
    requireKeys(
      record,
      ["langAbv", "term", "commonTerm", "binL", "binA", "binB", "pTC", "pCT"],
      where,
    );
    return {
      langAbv: requireString(record.langAbv, where, "langAbv"),
      term: requireString(record.term, where, "term"),
      commonTerm: requireString(record.commonTerm, where, "commonTerm"),
      binL: requireFinite(record.binL, where, "binL"),
      binA: requireFinite(record.binA, where, "binA"),
      binB: requireFinite(record.binB, where, "binB"),
      pTC: requireFinite(record.pTC, where, "pTC"),
      pCT: requireFinite(record.pCT, where, "pCT"),
    };
  });
}

export function parseHueBinned(json: string): Record<string, Record<string, RawHueTerm>> {
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new SchemaError("Upstream schema drift in hue_color_names_binned: expected an object.");
  }

  const result: Record<string, Record<string, RawHueTerm>> = {};
  for (const [lang, termsRaw] of Object.entries(parsed as Record<string, unknown>)) {
    const terms: Record<string, RawHueTerm> = {};
    const termsRecord = requireObject(termsRaw, `hue[${lang}]`);
    for (const [term, valueRaw] of Object.entries(termsRecord)) {
      const where = `hue[${lang}][${term}]`;
      const value = requireObject(valueRaw, where);
      requireKeys(value, ["simplifiedName", "commonName", "bins"], where);
      if (!Array.isArray(value.bins)) {
        throw new SchemaError(`Upstream schema drift in ${where}: bins is not an array.`);
      }
      terms[term] = {
        simplifiedName: requireString(value.simplifiedName, where, "simplifiedName"),
        commonName: requireString(value.commonName, where, "commonName"),
        bins: value.bins.map((bin, binIndex) => {
          const binWhere = `${where}.bins[${binIndex}]`;
          const binRecord = requireObject(bin, binWhere);
          return {
            pTC: requireFinite(binRecord.pTC, binWhere, "pTC"),
            // Not in requireKeys: unlike pTC, upstream may not carry a pCT
            // signal at hue-bin granularity at all. Absent is legitimate
            // here, not schema drift — optionalFinite maps that to NaN,
            // same convention as the CSV's blank centroid cells.
            pCT: optionalFinite(binRecord.pCT, binWhere, "pCT"),
          };
        }),
      };
    }
    result[lang] = terms;
  }
  return result;
}

/** Minimal RFC 4180 reader: handles quoted fields containing commas. */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === "\"" && line[i + 1] === "\"") {
        current += "\"";
        i++;
      } else if (char === "\"") {
        quoted = false;
      } else {
        current += char;
      }
    } else if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

export function parseBasicInfo(csv: string): RawBasicRow[] {
  const lines = csv
    .split("\n")
    .map(line => (line.endsWith("\r") ? line.slice(0, -1) : line))
    .filter(line => line.trim().length > 0);
  const headerLine = lines[0];
  if (headerLine === undefined) {
    throw new SchemaError("Upstream schema drift in basic_colors_info: file is empty.");
  }

  const header = parseCsvLine(headerLine);
  const required = ["lang_abv", "commonName", "simplifiedName", "avgFullL", "avgFullA", "avgFullB"];
  const missing = required.filter(column => !header.includes(column));
  if (missing.length > 0) {
    throw new SchemaError(
      `Upstream schema drift in basic_colors_info: missing ${missing.join(", ")}. `
      + `Present columns: ${header.join(", ")}`,
    );
  }

  const index = (column: string) => header.indexOf(column);
  return lines.slice(1).map((line, rowIndex) => {
    const fields = parseCsvLine(line);
    const where = `basic_colors_info[${rowIndex}]`;
    if (fields.length !== header.length) {
      throw new SchemaError(
        `Upstream schema drift in ${where}: expected ${header.length} columns, got ${fields.length}.`,
      );
    }
    return {
      lang_abv: requireString(fields[index("lang_abv")], where, "lang_abv"),
      commonName: requireString(fields[index("commonName")], where, "commonName"),
      simplifiedName: requireString(fields[index("simplifiedName")], where, "simplifiedName"),
      avgFullL: optionalFinite(fields[index("avgFullL")], where, "avgFullL"),
      avgFullA: optionalFinite(fields[index("avgFullA")], where, "avgFullA"),
      avgFullB: optionalFinite(fields[index("avgFullB")], where, "avgFullB"),
    };
  });
}

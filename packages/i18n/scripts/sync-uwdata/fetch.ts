import { UWDATA_COMMIT } from "../../src/sources/uwdata/source";

/** Raised when upstream's shape no longer matches what the transform expects. */
export class SchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchemaError";
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
}

export interface RawHueTerm {
  simplifiedName: string;
  commonName: string;
  bins: { pTC: number }[];
}

export interface RawBasicRow {
  lang_abv: string;
  commonName: string;
  simplifiedName: string;
  avgFullL: number;
  avgFullA: number;
  avgFullB: number;
}

const BASE = "https://raw.githubusercontent.com/uwdata/color-naming-in-different-languages";

export function upstreamUrl(path: string): string {
  return `${BASE}/${UWDATA_COMMIT}/${path}`;
}

export async function download(path: string): Promise<string> {
  const url = upstreamUrl(path);
  const response = await fetch(url);
  if (!response.ok) {
    throw new SchemaError(`Failed to download ${url}: HTTP ${response.status}`);
  }
  return response.text();
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
  if (typeof value !== "string" || value.length === 0) {
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

export function parseFullBinned(json: string): RawFullRecord[] {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    throw new SchemaError("Upstream schema drift in full_color_names_binned: expected an array.");
  }

  return parsed.map((raw, index) => {
    const record = raw as Record<string, unknown>;
    const where = `full_color_names_binned[${index}]`;
    requireKeys(
      record,
      ["langAbv", "term", "commonTerm", "binL", "binA", "binB", "pTC"],
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
    for (const [term, valueRaw] of Object.entries(termsRaw as Record<string, unknown>)) {
      const value = valueRaw as Record<string, unknown>;
      const where = `hue[${lang}][${term}]`;
      requireKeys(value, ["simplifiedName", "commonName", "bins"], where);
      if (!Array.isArray(value.bins)) {
        throw new SchemaError(`Upstream schema drift in ${where}: bins is not an array.`);
      }
      terms[term] = {
        simplifiedName: requireString(value.simplifiedName, where, "simplifiedName"),
        commonName: requireString(value.commonName, where, "commonName"),
        bins: value.bins.map((bin, binIndex) => {
          const binWhere = `${where}.bins[${binIndex}]`;
          const binRecord = bin as Record<string, unknown>;
          return { pTC: requireFinite(binRecord.pTC, binWhere, "pTC") };
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
      avgFullL: requireFinite(fields[index("avgFullL")], where, "avgFullL"),
      avgFullA: requireFinite(fields[index("avgFullA")], where, "avgFullA"),
      avgFullB: requireFinite(fields[index("avgFullB")], where, "avgFullB"),
    };
  });
}

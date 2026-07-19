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

export function parseFullBinned(json: string): RawFullRecord[] {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    throw new SchemaError("Upstream schema drift in full_color_names_binned: expected an array.");
  }

  return parsed.map((raw, index) => {
    const record = raw as Record<string, unknown>;
    requireKeys(
      record,
      ["langAbv", "term", "commonTerm", "binL", "binA", "binB", "pTC"],
      `full_color_names_binned[${index}]`,
    );
    return {
      langAbv: String(record.langAbv),
      term: String(record.term),
      commonTerm: String(record.commonTerm),
      binL: Number(record.binL),
      binA: Number(record.binA),
      binB: Number(record.binB),
      pTC: Number(record.pTC),
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
      requireKeys(value, ["simplifiedName", "commonName", "bins"], `hue[${lang}][${term}]`);
      if (!Array.isArray(value.bins)) {
        throw new SchemaError(`Upstream schema drift in hue[${lang}][${term}]: bins is not an array.`);
      }
      terms[term] = {
        simplifiedName: String(value.simplifiedName),
        commonName: String(value.commonName),
        bins: value.bins.map(bin => ({ pTC: Number((bin as Record<string, unknown>).pTC) })),
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
  const lines = csv.split("\n").filter(line => line.trim().length > 0);
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
  return lines.slice(1).map((line) => {
    const fields = parseCsvLine(line);
    return {
      lang_abv: fields[index("lang_abv")] ?? "",
      commonName: fields[index("commonName")] ?? "",
      simplifiedName: fields[index("simplifiedName")] ?? "",
      avgFullL: Number(fields[index("avgFullL")]),
      avgFullA: Number(fields[index("avgFullA")]),
      avgFullB: Number(fields[index("avgFullB")]),
    };
  });
}

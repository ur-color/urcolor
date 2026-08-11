/**
 * Raised when the Wikidata Query Service response no longer matches what the
 * transform expects, or when a request itself fails. `status` is set only for
 * HTTP failures, letting callers distinguish a retryable outage from real
 * schema drift.
 */
export class SchemaError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "SchemaError";
    this.status = status;
  }
}

export const ENDPOINT = "https://query.wikidata.org/sparql";

/** WDQS policy requires a descriptive agent identifying the client. */
export const USER_AGENT = "urcolor-i18n (https://github.com/ur-color/urcolor)";

/**
 * `SELECT DISTINCT` throughout is load-bearing. `wdt:P31/wdt:P279*` can reach
 * Q1075 by more than one route and SPARQL returns one solution per route, so
 * without it the item query returns 1,124 rows for 964 items and the label
 * query inflates from 10,799 rows to 14,705.
 *
 * The three queries are deliberately separate. Joining labels and aliases in
 * one SELECT cross-products them into ~29.5 MB over ~117 s, close enough to
 * the WDQS timeout to be a liability; split, the same data costs ~30 s.
 */
const COLOUR_ITEM = "?item wdt:P31/wdt:P279* wd:Q1075 ; wdt:P465 ?hex";

export const ITEMS_QUERY
  = `SELECT DISTINCT ?item ?hex ?sitelinks WHERE { ${COLOUR_ITEM} ; wikibase:sitelinks ?sitelinks }`;

export const LABELS_QUERY
  = `SELECT DISTINCT ?item ?label WHERE { ${COLOUR_ITEM} . ?item rdfs:label ?label }`;

export const ALIASES_QUERY
  = `SELECT DISTINCT ?item ?alias WHERE { ${COLOUR_ITEM} . ?item skos:altLabel ?alias }`;

/**
 * Which items are industrial catalogue entries rather than linguistic colour
 * names. Membership is a property of the item, so one statement covers every
 * language at once: Q24885519 is `Pantone 448 C` in English, `彩通448C` in
 * Chinese and `פנטון 448c` in Hebrew, and a label regex written in English
 * misses the other two.
 *
 * NCS uses `P361` rather than `P31` because its four items carry only
 * `P31 wd:Q1075`, the generic colour class, and are distinguished solely by
 * the system they are part of.
 */
export const CATALOGUE_QUERY = `SELECT DISTINCT ?item ?catalogue WHERE {
  { ?item wdt:P31 wd:Q104919542 . BIND("pantone" AS ?catalogue) }
  UNION { ?item wdt:P31 wd:Q17421658 . BIND("ral" AS ?catalogue) }
  UNION { ?item wdt:P361 wd:Q1503197 . BIND("ncs" AS ?catalogue) }
}`;

export type Catalogue = "pantone" | "ral" | "ncs";

const CATALOGUES: ReadonlySet<string> = new Set<Catalogue>(["pantone", "ral", "ncs"]);

export interface RawCatalogueRow {
  qid: string;
  catalogue: Catalogue;
}

export interface RawItemRow {
  qid: string;
  /** Six hex digits, no leading `#`, exactly as upstream stores it. */
  hex: string;
  sitelinks: number;
}

export interface RawLabelRow {
  qid: string;
  /** BCP 47-ish tag exactly as Wikidata spells it, e.g. `sr-ec`. */
  lang: string;
  value: string;
}

export type RawAliasRow = RawLabelRow;

export interface RunQueryOptions {
  /** Injected in tests; defaults to global `fetch`. */
  fetchImpl?: typeof fetch;
  /** Attempts after the first. Default 3. */
  retries?: number;
  /** Base backoff delay in ms, doubled per attempt. Default 1000. */
  delayMs?: number;
}

/** 429 and 5xx are transient; 4xx (other than 429) never becomes valid on retry. */
function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * POSTs a query and returns the raw response body.
 *
 * Retries with exponential backoff: WDQS rate limits, and a transient 502 was
 * observed during development on a query that succeeded on immediate retry.
 * A bare fetch here would make syncs flaky for no reason.
 */
export async function runQuery(query: string, options: RunQueryOptions = {}): Promise<string> {
  const { fetchImpl = fetch, retries = 3, delayMs = 1000 } = options;
  let lastStatus = 0;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: {
        "Accept": "application/sparql-results+json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      body: new URLSearchParams({ query }).toString(),
    });

    if (response.ok) return response.text();

    lastStatus = response.status;
    if (!isRetryable(response.status)) break;
    if (attempt < retries) await sleep(delayMs * 2 ** attempt);
  }

  throw new SchemaError(`WDQS query failed: HTTP ${lastStatus}`, lastStatus);
}

function requireObject(value: unknown, where: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new SchemaError(`WDQS schema drift in ${where}: expected an object, got ${JSON.stringify(value)}.`);
  }
  return value as Record<string, unknown>;
}

/** The `bindings` array, validated. Every parser starts here. */
function bindingsOf(json: string, where: string): Record<string, unknown>[] {
  const root = requireObject(JSON.parse(json) as unknown, where);
  const results = requireObject(root.results, `${where}.results`);
  if (!Array.isArray(results.bindings)) {
    throw new SchemaError(`WDQS schema drift in ${where}: results.bindings is not an array.`);
  }
  return results.bindings.map((binding, index) => requireObject(binding, `${where}.bindings[${index}]`));
}

function cellValue(binding: Record<string, unknown>, field: string, where: string): string {
  const cell = requireObject(binding[field], `${where}.${field}`);
  const value = cell.value;
  if (typeof value !== "string" || value.length === 0) {
    throw new SchemaError(`WDQS schema drift in ${where}: ${field}.value must be a non-empty string.`);
  }
  return value;
}

function cellLanguage(binding: Record<string, unknown>, field: string, where: string): string {
  const cell = requireObject(binding[field], `${where}.${field}`);
  const lang = cell["xml:lang"];
  if (typeof lang !== "string" || lang.length === 0) {
    throw new SchemaError(`WDQS schema drift in ${where}: ${field} is missing xml:lang.`);
  }
  return lang;
}

const ENTITY_PREFIX = "http://www.wikidata.org/entity/";
const QID_PATTERN = /^Q[1-9][0-9]*$/;
const HEX_PATTERN = /^[0-9a-fA-F]{6}$/;

function qidOf(uri: string, where: string): string {
  if (!uri.startsWith(ENTITY_PREFIX)) {
    throw new SchemaError(`WDQS schema drift in ${where}: "${uri}" is not a Wikidata entity URI.`);
  }
  const qid = uri.slice(ENTITY_PREFIX.length);
  if (!QID_PATTERN.test(qid)) {
    throw new SchemaError(`WDQS schema drift in ${where}: "${qid}" is not a well-formed QID.`);
  }
  return qid;
}

export function parseItems(json: string): RawItemRow[] {
  return bindingsOf(json, "items").map((binding, index) => {
    const where = `items.bindings[${index}]`;
    const hex = cellValue(binding, "hex", where);
    if (!HEX_PATTERN.test(hex)) {
      throw new SchemaError(`WDQS schema drift in ${where}: hex "${hex}" is not six hex digits.`);
    }
    const sitelinks = Number(cellValue(binding, "sitelinks", where));
    if (!Number.isFinite(sitelinks)) {
      throw new SchemaError(`WDQS schema drift in ${where}: sitelinks is not a number.`);
    }
    return { qid: qidOf(cellValue(binding, "item", where), where), hex, sitelinks };
  });
}

/** Shared by labels and aliases — the two differ only in the projected variable name. */
function parseLangRows(json: string, field: string, where: string): RawLabelRow[] {
  return bindingsOf(json, where).map((binding, index) => {
    const at = `${where}.bindings[${index}]`;
    return {
      qid: qidOf(cellValue(binding, "item", at), at),
      lang: cellLanguage(binding, field, at),
      value: cellValue(binding, field, at),
    };
  });
}

export function parseLabels(json: string): RawLabelRow[] {
  return parseLangRows(json, "label", "labels");
}

export function parseAliases(json: string): RawAliasRow[] {
  return parseLangRows(json, "alias", "aliases");
}

/**
 * An unknown catalogue name throws rather than being ignored. Silently
 * widening the split to a system this package has no replacement source for
 * would delete names and leave those colours nameless.
 */
export function parseCatalogue(json: string): RawCatalogueRow[] {
  return bindingsOf(json, "catalogue").map((binding, index) => {
    const where = `catalogue.bindings[${index}]`;
    const catalogue = cellValue(binding, "catalogue", where);
    if (!CATALOGUES.has(catalogue)) {
      throw new SchemaError(
        `WDQS schema drift in ${where}: "${catalogue}" is not a known catalogue.`,
      );
    }
    return {
      qid: qidOf(cellValue(binding, "item", where), where),
      catalogue: catalogue as Catalogue,
    };
  });
}

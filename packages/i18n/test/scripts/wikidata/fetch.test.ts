import { describe, expect, it } from "bun:test";
import {
  ALIASES_QUERY,
  CATALOGUE_QUERY,
  ITEMS_QUERY,
  LABELS_QUERY,
  SchemaError,
  parseAliases,
  parseCatalogue,
  parseItems,
  parseLabels,
  runQuery,
} from "../../../scripts/sync-wikidata/fetch";

const fixture = (name: string) => Bun.file(`${import.meta.dir}/../../fixtures/wikidata/${name}`).text();

function sparqlResponse(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "content-type": "application/sparql-results+json" } });
}

describe("queries", () => {
  it("every query uses SELECT DISTINCT", () => {
    // Without DISTINCT the P31/P279* path yields duplicate solutions.
    for (const query of [ITEMS_QUERY, LABELS_QUERY, ALIASES_QUERY]) {
      expect(query).toContain("SELECT DISTINCT");
    }
  });
});

describe("parseItems", () => {
  it("parses rows and extracts the QID from the entity URI", async () => {
    const rows = parseItems(await fixture("items.json"));
    expect(rows).toHaveLength(7);
    expect(rows[0]).toEqual({ qid: "Q943", hex: "FFFF00", sitelinks: 189 });
  });

  it("keeps both rows of a multi-hex item", async () => {
    const rows = parseItems(await fixture("items.json"));
    expect(rows.filter(r => r.qid === "Q12894641").map(r => r.hex).sort())
      .toEqual(["BF00FF", "C8A2C8"]);
  });

  it("throws SchemaError on a malformed hex", () => {
    const bad = JSON.stringify({
      head: { vars: ["item", "hex", "sitelinks"] },
      results: { bindings: [{
        item: { type: "uri", value: "http://www.wikidata.org/entity/Q1" },
        hex: { type: "literal", value: "ZZZ" },
        sitelinks: { type: "literal", value: "1" },
      }] },
    });
    expect(() => parseItems(bad)).toThrow(SchemaError);
    expect(() => parseItems(bad)).toThrow(/hex/);
  });

  it("throws SchemaError on a non-entity URI", () => {
    const bad = JSON.stringify({
      head: { vars: ["item", "hex", "sitelinks"] },
      results: { bindings: [{
        item: { type: "uri", value: "http://example.invalid/nope" },
        hex: { type: "literal", value: "FFFFFF" },
        sitelinks: { type: "literal", value: "1" },
      }] },
    });
    expect(() => parseItems(bad)).toThrow(SchemaError);
  });

  it("throws SchemaError when bindings is missing", () => {
    expect(() => parseItems(JSON.stringify({ head: { vars: [] } }))).toThrow(SchemaError);
  });
});

describe("parseLabels", () => {
  it("parses the language tag from xml:lang", async () => {
    const rows = parseLabels(await fixture("labels.json"));
    expect(rows).toHaveLength(14);
    expect(rows[0]).toEqual({ qid: "Q943", lang: "en", value: "yellow" });
    expect(rows.find(r => r.lang === "ka")?.value).toBe("ყვითელი");
  });

  it("throws SchemaError when xml:lang is absent", () => {
    const bad = JSON.stringify({
      head: { vars: ["item", "label"] },
      results: { bindings: [{
        item: { type: "uri", value: "http://www.wikidata.org/entity/Q1" },
        label: { type: "literal", value: "orphan" },
      }] },
    });
    expect(() => parseLabels(bad)).toThrow(SchemaError);
    expect(() => parseLabels(bad)).toThrow(/xml:lang/);
  });
});

describe("parseAliases", () => {
  it("parses alias rows", async () => {
    const rows = parseAliases(await fixture("aliases.json"));
    expect(rows).toHaveLength(4);
    expect(rows[0]).toEqual({ qid: "Q943", lang: "en", value: "yellow color" });
  });
});

describe("runQuery", () => {
  it("sends a descriptive User-Agent and requests SPARQL JSON", async () => {
    const seen: Request[] = [];
    const fetchImpl = ((input: string | URL | Request, init?: RequestInit) => {
      seen.push(new Request(input as string, init));
      return Promise.resolve(sparqlResponse("{}"));
    }) as unknown as typeof fetch;

    await runQuery("SELECT DISTINCT ?x WHERE {}", { fetchImpl });
    expect(seen).toHaveLength(1);
    expect(seen[0]!.headers.get("user-agent")).toContain("urcolor-i18n");
    expect(seen[0]!.headers.get("accept")).toContain("sparql-results+json");
  });

  it("retries on 502 and succeeds", async () => {
    let calls = 0;
    const fetchImpl = (() => {
      calls++;
      return Promise.resolve(calls === 1 ? sparqlResponse("nope", 502) : sparqlResponse("{\"ok\":1}"));
    }) as unknown as typeof fetch;

    const body = await runQuery("SELECT DISTINCT ?x WHERE {}", { fetchImpl, delayMs: 0 });
    expect(calls).toBe(2);
    expect(body).toBe("{\"ok\":1}");
  });

  it("retries on 429", async () => {
    let calls = 0;
    const fetchImpl = (() => {
      calls++;
      return Promise.resolve(calls < 3 ? sparqlResponse("slow down", 429) : sparqlResponse("{}"));
    }) as unknown as typeof fetch;

    await runQuery("SELECT DISTINCT ?x WHERE {}", { fetchImpl, delayMs: 0 });
    expect(calls).toBe(3);
  });

  it("gives up after the retry budget and reports the status", async () => {
    const fetchImpl = (() => Promise.resolve(sparqlResponse("down", 503))) as unknown as typeof fetch;
    const attempt = runQuery("SELECT DISTINCT ?x WHERE {}", { fetchImpl, retries: 2, delayMs: 0 });
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await expect(attempt).rejects.toThrow(SchemaError);
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await expect(attempt).rejects.toThrow(/503/);
  });

  it("does not retry a 400 — a malformed query will never succeed", async () => {
    let calls = 0;
    const fetchImpl = (() => {
      calls++;
      return Promise.resolve(sparqlResponse("bad query", 400));
    }) as unknown as typeof fetch;

    // eslint-disable-next-line @typescript-eslint/await-thenable
    await expect(runQuery("nonsense", { fetchImpl, delayMs: 0 })).rejects.toThrow(SchemaError);
    expect(calls).toBe(1);
  });
});

describe("parseCatalogue", () => {
  it("reads QID and catalogue name from each binding", async () => {
    const rows = parseCatalogue(await fixture("catalogue.json"));
    expect(rows).toEqual([
      { qid: "Q2516404", catalogue: "ral" },
      { qid: "Q24885519", catalogue: "pantone" },
    ]);
  });

  it("throws on an unknown catalogue name", async () => {
    // Drift here would silently widen the split to a system this package has
    // no source for, deleting names with nothing to replace them.
    const drifted = (await fixture("catalogue.json")).replace('"ral"', '"munsell"');
    expect(() => parseCatalogue(drifted)).toThrow(SchemaError);
  });

  it("queries all three discriminators", () => {
    expect(CATALOGUE_QUERY).toContain("wd:Q104919542");
    expect(CATALOGUE_QUERY).toContain("wd:Q17421658");
    expect(CATALOGUE_QUERY).toContain("wd:Q1503197");
  });
});

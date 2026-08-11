import { describe, expect, it } from "bun:test";
import { parsePantone } from "../../../scripts/sync-pantone/fetch";
import { buildPantoneChunk } from "../../../scripts/sync-pantone/transform";

const fixture = () => Bun.file(`${import.meta.dir}/../../fixtures/pantone/colors.json`).text();
const chunkOf = async () => buildPantoneChunk(parsePantone(await fixture()));

describe("buildPantoneChunk", () => {
  it("ships a language-neutral palette chunk", async () => {
    const chunk = await chunkOf();
    expect(chunk.lang).toBe("und");
    expect(chunk.model).toBe("palette");
    expect(chunk.terms).toHaveLength(4);
  });

  it("prefixes every name and spells it with spaces", async () => {
    const chunk = await chunkOf();
    expect(chunk.terms.map(entry => entry[1])).toEqual([
      "pantone egret",
      "pantone classic blue",
      "pantone living coral",
      "pantone egret",
    ]);
    for (const [term, name] of chunk.terms) expect(term).toBe(name);
  });

  it("aliases the TCX number, the spaced name and upstream's slug", async () => {
    const chunk = await chunkOf();
    expect(chunk.aliases["19-4052"]).toBe(1);
    expect(chunk.aliases["classic blue"]).toBe(1);
    expect(chunk.aliases["classic-blue"]).toBe(1);
  });

  it("keeps every entry reachable when two share a name", async () => {
    const chunk = await chunkOf();
    // The TCX number is the real identifier, so both egrets keep their own.
    expect(chunk.aliases["11-0103"]).toBe(0);
    expect(chunk.aliases["13-0000"]).toBe(3);
    // The name alias resolves to the first, deterministically.
    expect(chunk.aliases["egret"]).toBe(0);
  });

  it("converts hex to a finite Oklab centroid and keeps provenance", async () => {
    const chunk = await chunkOf();
    const [, , centroid, pCT] = chunk.terms[1]!;
    expect(centroid!.every(Number.isFinite)).toBe(true);
    // This source carries no naming-frequency signal, so pCT is always null.
    expect(pCT).toBeNull();
    expect(chunk.provenance[1]).toEqual(["19-4052", "0F4C81"]);
  });
});

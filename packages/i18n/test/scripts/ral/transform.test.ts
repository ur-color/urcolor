import { describe, expect, it } from "bun:test";
import { parseRalClassic } from "../../../scripts/sync-ral/fetch";
import { buildRalChunk } from "../../../scripts/sync-ral/transform";

const fixture = () => Bun.file(`${import.meta.dir}/../../fixtures/ral/classic.js.txt`).text();
const chunkOf = async () => buildRalChunk(parseRalClassic(await fixture(), 3));

describe("buildRalChunk", () => {
  it("ships a language-neutral palette chunk of prefixed codes", async () => {
    const chunk = await chunkOf();
    expect(chunk.lang).toBe("und");
    expect(chunk.model).toBe("palette");
    expect(chunk.terms.map(entry => entry[1])).toEqual(["ral 1000", "ral 1001", "ral 3020"]);
    for (const [term, name] of chunk.terms) expect(term).toBe(name);
  });

  it("aliases the bare code and the English description", async () => {
    const chunk = await chunkOf();
    expect(chunk.aliases["3020"]).toBe(2);
    expect(chunk.aliases["traffic red"]).toBe(2);
  });

  it("keeps provenance and a finite centroid", async () => {
    const chunk = await chunkOf();
    expect(chunk.provenance[2]).toEqual(["3020", "C1121C"]);
    expect(chunk.terms[2]![2]!.every(Number.isFinite)).toBe(true);
    // This source carries no naming-frequency signal, so pCT is always null.
    expect(chunk.terms[2]![3]).toBeNull();
  });

  it("keeps the first entry when two codes share a description", () => {
    const chunk = buildRalChunk([
      { code: "1000", description: "Green beige", hex: "CDBA88" },
      { code: "1001", description: "Green beige", hex: "D0B084" },
    ]);
    expect(chunk.terms).toHaveLength(2);
    expect(chunk.aliases["green beige"]).toBe(0);
    expect(chunk.aliases["1001"]).toBe(1);
  });
});

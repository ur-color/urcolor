import { describe, expect, it } from "bun:test";
import { RalSchemaError, parseRalClassic } from "../../../scripts/sync-ral/fetch";

const fixture = () => Bun.file(`${import.meta.dir}/../../fixtures/ral/classic.js.txt`).text();

describe("parseRalClassic", () => {
  it("reads code, description and hex from each entry", async () => {
    expect(parseRalClassic(await fixture(), 3)).toEqual([
      { code: "1000", description: "Green beige", hex: "CDBA88" },
      { code: "1001", description: "Beige", hex: "D0B084" },
      { code: "3020", description: "Traffic red", hex: "C1121C" },
    ]);
  });

  it("throws when upstream yields fewer rows than expected", async () => {
    // The floor is what catches an upstream reformat the regex under-matches.
    const source = await fixture();
    expect(() => parseRalClassic(source, 213)).toThrow(RalSchemaError);
  });

  it("throws when the shape changes entirely", () => {
    expect(() => parseRalClassic("export const classic = {}", 1)).toThrow(RalSchemaError);
  });
});

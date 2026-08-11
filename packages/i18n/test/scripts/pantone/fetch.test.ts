import { describe, expect, it } from "bun:test";
import { PantoneSchemaError, parsePantone } from "../../../scripts/sync-pantone/fetch";

const fixture = () => Bun.file(`${import.meta.dir}/../../fixtures/pantone/colors.json`).text();

describe("parsePantone", () => {
  it("reads code, name and hex from every entry", async () => {
    expect(parsePantone(await fixture())).toEqual([
      { code: "11-0103", slug: "egret", hex: "F3ECE0" },
      { code: "19-4052", slug: "classic-blue", hex: "0F4C81" },
      { code: "16-1546", slug: "living-coral", hex: "FF6F61" },
      { code: "13-0000", slug: "egret", hex: "EFE9E2" },
    ]);
  });

  it("throws when the payload is an array rather than a keyed object", () => {
    expect(() => parsePantone("[]")).toThrow(PantoneSchemaError);
  });

  it("throws on a key that is not a TCX number", async () => {
    const drifted = (await fixture()).replace('"11-0103"', '"not-a-code"');
    expect(() => parsePantone(drifted)).toThrow(PantoneSchemaError);
  });

  it("throws on a malformed hex", async () => {
    const drifted = (await fixture()).replace('"f3ece0"', '"gggggg"');
    expect(() => parsePantone(drifted)).toThrow(PantoneSchemaError);
  });

  it("throws on a missing name", async () => {
    const drifted = (await fixture()).replace('"name": "egret", "hex": "f3ece0"', '"hex": "f3ece0"');
    expect(() => parsePantone(drifted)).toThrow(PantoneSchemaError);
  });
});

import { describe, expect, it } from "bun:test";
import "../../src/index";
import { getSource, listSources } from "../../src/engine/registry";

describe("source registry", () => {
  it("lists the uwdata source", () => {
    const ids = listSources().map(s => s.id);
    expect(ids).toContain("uwdata");
  });

  it("exposes citation, disclaimer and pinned revision", () => {
    const source = getSource("uwdata");
    expect(source.commitSha).toBe("f0d3e30db9e4b2c3b703bde0d816043eb48a6cb5");
    expect(source.citation).toContain("EuroVis");
    expect(source.disclaimer).toContain("not meant to be a prescriptive definition");
    expect(source.url).toBe("https://github.com/uwdata/color-naming-in-different-languages");
  });

  it("throws a helpful error for an unknown source", () => {
    expect(() => getSource("nope")).toThrow(/unknown source "nope".*uwdata/i);
  });
});

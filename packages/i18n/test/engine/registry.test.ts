import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import "../../src/index";
import { getSource, listSources, setDefaultSources, getDefaultSources } from "../../src/engine/registry";

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

  it("freezes the registered descriptor and its languages map so mutation attempts don't corrupt registry state", () => {
    const source = getSource("uwdata");
    expect(Object.isFrozen(source)).toBe(true);
    expect(Object.isFrozen(source.languages)).toBe(true);

    // ESM modules run in strict mode, so writing to a frozen object throws
    // rather than silently no-op'ing.
    expect(() => {
      (source as unknown as { title: string }).title = "tampered";
    }).toThrow(TypeError);
    expect(() => {
      (source.languages as Record<string, unknown>).ko = { model: "full", terms: 0, coverage: 0 };
    }).toThrow(TypeError);
    expect(() => {
      (source.languages as Record<string, unknown>).zz = { model: "full", terms: 1, coverage: 1 };
    }).toThrow(TypeError);

    // A second lookup must see the original values, proving the mutation
    // attempts above never reached the registry's stored state.
    const again = getSource("uwdata");
    expect(again.title).toBe("Color Naming in Different Languages");
    expect(again.languages.ko?.terms).toBeGreaterThan(0);
    expect(again.languages.zz).toBeUndefined();
  });
});

describe("default sources", () => {
  // The default chain is shared module state, not scoped to this describe
  // block. Save and restore it around these tests so installing "alpha"/
  // "beta" here doesn't leak into whatever suite runs next in the same
  // process and corrupt an assertion against the real shipped chain.
  let realDefaults: readonly string[];
  beforeAll(() => {
    realDefaults = getDefaultSources();
  });
  afterAll(() => {
    setDefaultSources(realDefaults);
  });

  it("round-trips what was set", () => {
    setDefaultSources(["alpha", "beta"]);
    expect(getDefaultSources()).toEqual(["alpha", "beta"]);
  });

  it("returns a frozen array so callers cannot corrupt shared state", () => {
    setDefaultSources(["alpha"]);
    const sources = getDefaultSources();
    expect(Object.isFrozen(sources)).toBe(true);
    expect(() => (sources as string[]).push("beta")).toThrow();
    expect(getDefaultSources()).toEqual(["alpha"]);
  });

  it("copies its argument, so later mutation of the caller's array is ignored", () => {
    const mine = ["alpha"];
    setDefaultSources(mine);
    mine.push("beta");
    expect(getDefaultSources()).toEqual(["alpha"]);
  });
});

import { describe, expect, it } from "bun:test";
import * as core from "@urcolor/core";
import * as urcolor from "urcolor";
import { Color } from "urcolor";

// The whole contract of this package is "same engine, shorter name". A wrapper
// that drifted — a missing export, or a second copy of the module bundled in —
// would be worse than no wrapper at all, since `instanceof` would start lying
// between a color made in application code and one made by a framework adapter.
describe("urcolor", () => {
  it("re-exports every binding of @urcolor/core", () => {
    const missing = Object.keys(core).filter(k => !(k in urcolor));
    expect(missing).toEqual([]);
  });

  it("adds nothing of its own", () => {
    const extra = Object.keys(urcolor).filter(k => !(k in core));
    expect(extra).toEqual([]);
  });

  it("shares one module instance, not a copy", () => {
    for (const key of Object.keys(core)) {
      expect(urcolor[key as keyof typeof urcolor]).toBe(core[key as keyof typeof core]);
    }
  });

  it("makes colors the core recognises as its own", () => {
    const mine = Color.parse("#3b82f6")!;
    const theirs = core.Color.parse("#3b82f6")!;
    expect(mine).toBeInstanceOf(core.Color);
    expect(theirs).toBeInstanceOf(Color);
    expect(mine.to("oklch").toString()).toBe(theirs.to("oklch").toString());
  });

  it("works end to end through the short name alone", () => {
    expect(Color.parse("red")!.to("oklch").toString()).toStartWith("oklch(");
    expect(urcolor.serialize(urcolor.parse("hsl(210 80% 50%)"), "hex")).toBe("#1980e6");
  });
});

import { describe, expect, it } from "bun:test";
import * as flat from "../src/index";
import * as namespaced from "../src/namespaced";

/**
 * The namespaced barrel is hand-maintained: every component added to a folder's
 * own barrel has to be re-listed here by hand. That step has been missed before
 * — `ColorArea.Area` was absent for several releases' worth of work, and because
 * a missing part renders as nothing rather than throwing, a consumer using the
 * namespaced API got a picker that drew correctly and ignored every pointer and
 * key press. These tests make the omission fail loudly instead.
 */

/** Component names exported from the flat barrel, e.g. `ColorAreaThumb`. */
const FLAT_COMPONENTS = Object.keys(flat).filter(name => /^Color[A-Z]/.test(name));

/** Every `Family.Part` pair the namespaced barrel exposes. */
const NAMESPACED_PAIRS = Object.entries(namespaced)
  .filter(([, group]) => group !== null && typeof group === "object")
  .flatMap(([family, group]) => Object.keys(group as object).map(part => ({ family, part })));

describe("the namespaced barrel", () => {
  it("exposes every component the flat barrel does", () => {
    const covered = new Set(NAMESPACED_PAIRS.map(({ family, part }) => `${family}${part}`));
    // `ColorSwatchRoot` is exposed as `ColorSwatch.Root`, so the concatenation
    // reconstructs the flat name for every part.
    const missing = FLAT_COMPONENTS.filter(name => !covered.has(name));
    expect(missing).toEqual([]);
  });

  it("exposes the ColorArea interaction surface", () => {
    // Called out on its own because this is the part whose absence is silent:
    // ColorAreaRoot binds no pointer or keyboard handlers, so a picker built
    // without ColorArea.Area is inert rather than broken-looking.
    expect(namespaced.ColorArea.Area).toBeDefined();
    expect(namespaced.ColorArea.Area).toBe(flat.ColorAreaArea);
  });

  it("points every namespaced part at the same component as the flat export", () => {
    for (const { family, part } of NAMESPACED_PAIRS) {
      const group = namespaced[family as keyof typeof namespaced] as Record<string, unknown>;
      const flatName = `${family}${part}` as keyof typeof flat;
      expect(group[part]).toBe(flat[flatName]);
    }
  });
});

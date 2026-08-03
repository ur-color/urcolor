import { describe, expect, it } from "bun:test";
import { insertUnreleased } from "./prepare-release";

const CHANGELOG = `# Changelog

## Unreleased

### Changed

- A hand-written entry explaining why.

## [1.0.0] - 2026-08-03
`;

describe("insertUnreleased", () => {
  it("writes directly under the heading", () => {
    const out = insertUnreleased(CHANGELOG, "### Fixed\n\n- generated line");
    expect(out).toContain("## Unreleased\n\n### Fixed\n\n- generated line");
  });

  // The prose in these changelogs says why a change was made, which a commit
  // subject cannot reconstruct. Generated lines are a floor, not a replacement.
  it("keeps what a human already wrote", () => {
    const out = insertUnreleased(CHANGELOG, "### Fixed\n\n- generated line");
    expect(out).toContain("- A hand-written entry explaining why.");
    expect(out).toContain("## [1.0.0] - 2026-08-03");
  });

  it("throws when there is no Unreleased section to write under", () => {
    expect(() => insertUnreleased("# Changelog\n", "### Fixed\n\n- x")).toThrow(/no .*Unreleased/);
  });
});

import { describe, expect, it } from "bun:test";
import { rollover, unreleasedNotes } from "./rollover-changelog";

const CHANGELOG = `# Changelog

## Unreleased

### Added

- A thing.

## [0.0.4] - 2026-02-27

- An older thing.
`;

describe("unreleasedNotes", () => {
  it("returns the section body, without the heading", () => {
    expect(unreleasedNotes(CHANGELOG)).toBe("### Added\n\n- A thing.");
  });

  it("stops at the previous release rather than running to the end", () => {
    expect(unreleasedNotes(CHANGELOG)).not.toContain("An older thing");
  });

  // The repo writes `## Unreleased`; Keep a Changelog's own examples bracket it.
  // The publish workflow used to match only the bracketed form, so every release
  // it cut shipped with empty notes.
  it("accepts the bracketed spelling too", () => {
    expect(unreleasedNotes(CHANGELOG.replace("## Unreleased", "## [Unreleased]")))
      .toBe("### Added\n\n- A thing.");
  });

  it("is empty when there is nothing unreleased", () => {
    expect(unreleasedNotes("# Changelog\n\n## Unreleased\n\n## [0.0.4] - 2026-02-27\n")).toBe("");
    expect(unreleasedNotes("# Changelog\n")).toBe("");
  });
});

describe("rollover", () => {
  it("closes the section and opens an empty one", () => {
    const next = rollover(CHANGELOG, "0.1.0", "2026-08-03");
    expect(next).toContain("## Unreleased\n\n## [0.1.0] - 2026-08-03\n\n### Added");
    expect(unreleasedNotes(next)).toBe("");
  });

  it("keeps the notes under the new version heading", () => {
    const next = rollover(CHANGELOG, "0.1.0", "2026-08-03");
    const body = next.slice(next.indexOf("## [0.1.0]"), next.indexOf("## [0.0.4]"));
    expect(body).toContain("- A thing.");
  });

  it("leaves earlier releases untouched", () => {
    expect(rollover(CHANGELOG, "0.1.0", "2026-08-03")).toContain("## [0.0.4] - 2026-02-27");
  });

  it("throws when there is no Unreleased heading to close", () => {
    expect(() => rollover("# Changelog\n", "0.1.0", "2026-08-03")).toThrow(/no .* heading/);
  });
});

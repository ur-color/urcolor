import { describe, expect, it } from "bun:test";

describe("@urcolor/i18n exports", () => {
  it("is importable", async () => {
    const i18n = await import("../src/index");
    expect(i18n).toBeDefined();
  });
});

import { describe, expect, it } from "bun:test";
import * as i18n from "../src/index";

describe("@urcolor/i18n exports", () => {
  it("is importable", () => {
    expect(i18n).toBeDefined();
  });
});

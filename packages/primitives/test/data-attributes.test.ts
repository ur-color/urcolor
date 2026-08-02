import { describe, it, expect } from "bun:test";
import * as attrs from "../src/data-attributes";

describe("data attribute names", () => {
  it("exposes every shared data-* name", () => {
    expect(attrs.DATA_DISABLED).toBe("data-disabled");
    expect(attrs.DATA_ORIENTATION).toBe("data-orientation");
    expect(attrs.DATA_PRESSED).toBe("data-pressed");
    expect(attrs.DATA_READONLY).toBe("data-readonly");
    expect(attrs.DATA_DRAGGING).toBe("data-dragging");
    expect(attrs.DATA_COLOR_TRIANGLE_ROOT).toBe("data-color-triangle-root");
    expect(attrs.DATA_SLIDER_AREA_IMPL).toBe("data-slider-area-impl");
  });
  it("uses only lowercase kebab-case data- names", () => {
    for (const value of Object.values(attrs)) {
      expect(value).toMatch(/^data-[a-z-]+$/);
    }
  });
});

import { describe, it, expect } from "bun:test";
import { CHECKERBOARD_BACKGROUND, renderToCanvas } from "../src/canvas";

function fakeCanvas(clientWidth: number, clientHeight: number) {
  return {
    clientWidth,
    clientHeight,
    width: 0,
    height: 0,
    getContext: () => null,
  } as unknown as HTMLCanvasElement;
}

describe("CHECKERBOARD_BACKGROUND", () => {
  it("is a repeating conic gradient", () => {
    expect(CHECKERBOARD_BACKGROUND).toContain("repeating-conic-gradient");
  });
});

describe("renderToCanvas", () => {
  it("does not throw when the 2D context is unavailable", () => {
    expect(() => renderToCanvas({
      canvas: fakeCanvas(10, 10),
      pixels: new Uint8ClampedArray(4),
      sampleWidth: 1,
      sampleHeight: 1,
    })).not.toThrow();
  });

  it("does not throw when the canvas has zero size", () => {
    expect(() => renderToCanvas({
      canvas: fakeCanvas(0, 0),
      pixels: new Uint8ClampedArray(4),
      sampleWidth: 1,
      sampleHeight: 1,
    })).not.toThrow();
  });

  it("leaves the backing store untouched for a zero-size canvas", () => {
    const canvas = fakeCanvas(0, 0);
    renderToCanvas({ canvas, pixels: new Uint8ClampedArray(4), sampleWidth: 1, sampleHeight: 1 });
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });
});

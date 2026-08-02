import { describe, it, expect } from "bun:test";
import { render } from "@testing-library/react";
import { Color } from "@urcolor/core";
import { ColorTriangleRoot } from "../root/ColorTriangleRoot";
import { ColorTriangleThumb } from "./ColorTriangleThumb";

function renderThumb(props: { disabled?: boolean } = {}) {
  return render(
    <ColorTriangleRoot value={Color.parse("hsl(210, 80%, 50%)")!} disabled={props.disabled}>
      <ColorTriangleThumb data-testid="thumb" />
    </ColorTriangleRoot>,
  );
}

describe("ColorTriangleThumb", () => {
  it("is defined", () => {
    expect(ColorTriangleThumb).toBeDefined();
  });

  it("is a focusable slider", () => {
    const { getByTestId } = renderThumb();
    expect(getByTestId("thumb").getAttribute("role")).toBe("slider");
    expect(getByTestId("thumb").getAttribute("tabindex")).toBe("0");
  });

  it("announces every active channel in aria-label", () => {
    const { getByTestId } = renderThumb();
    const label = getByTestId("thumb").getAttribute("aria-label")!;
    expect(label.split(", ").length).toBeGreaterThanOrEqual(2);
  });

  it("announces channel values in aria-valuetext", () => {
    const { getByTestId } = renderThumb();
    expect(getByTestId("thumb").getAttribute("aria-valuetext")).toContain(",");
  });

  it("carries the role description and x-channel value bounds", () => {
    const { getByTestId } = renderThumb();
    const thumb = getByTestId("thumb");
    expect(thumb.getAttribute("aria-roledescription")).toBe("Color thumb");
    expect(thumb.getAttribute("aria-valuemin")).toBeTruthy();
    expect(thumb.getAttribute("aria-valuemax")).toBeTruthy();
  });

  it("drops the tab stop when disabled", () => {
    const { getByTestId } = renderThumb({ disabled: true });
    expect(getByTestId("thumb").hasAttribute("tabindex")).toBe(false);
  });

  it("lets an explicit aria-label win", () => {
    const { getByTestId } = render(
      <ColorTriangleRoot value={Color.parse("hsl(210, 80%, 50%)")!}>
        <ColorTriangleThumb data-testid="thumb" aria-label="Pick a colour" />
      </ColorTriangleRoot>,
    );
    expect(getByTestId("thumb").getAttribute("aria-label")).toBe("Pick a colour");
  });
});

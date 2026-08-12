import { describe, it, expect, afterEach, beforeEach } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { Color } from "@urcolor/core";
import { ColorWheelRoot } from "../root/ColorWheelRoot";
import { ColorWheelThumb } from "./ColorWheelThumb";

function renderThumb(props: { disabled?: boolean } = {}) {
  return render(
    <ColorWheelRoot value={Color.parse("hsl(210, 80%, 50%)")} disabled={props.disabled}>
      <ColorWheelThumb data-testid="thumb" />
    </ColorWheelRoot>,
  );
}

// `@testing-library/react` registers its auto-cleanup `afterEach` only once, when the
// module is first imported, so under `bun test` it is scoped to whichever test file
// imported it first. Unmount explicitly on both sides of every test so a sibling file's
// leaked DOM cannot make `getByTestId` ambiguous here.
beforeEach(cleanup);
afterEach(cleanup);

describe("ColorWheelThumb", () => {
  it("is defined", () => {
    expect(ColorWheelThumb).toBeDefined();
  });

  it("is a focusable slider", () => {
    const { getByTestId } = renderThumb();
    const thumb = getByTestId("thumb");
    expect(thumb.getAttribute("role")).toBe("slider");
    expect(thumb.getAttribute("tabindex")).toBe("0");
  });

  it("announces both channels in aria-label", () => {
    const { getByTestId } = renderThumb();
    expect(getByTestId("thumb").getAttribute("aria-label")).toBe("Hue, Saturation");
  });

  it("announces both channel values in aria-valuetext", () => {
    const { getByTestId } = renderThumb();
    const text = getByTestId("thumb").getAttribute("aria-valuetext");
    expect(text).toContain("Hue");
    expect(text).toContain("Saturation");
  });

  it("reports the angle channel as aria-valuenow", () => {
    const { getByTestId } = renderThumb();
    const thumb = getByTestId("thumb");
    expect(thumb.getAttribute("aria-valuenow")).toBeTruthy();
    expect(thumb.getAttribute("aria-valuemin")).toBeTruthy();
    expect(thumb.getAttribute("aria-valuemax")).toBeTruthy();
  });

  it("carries the 2D slider role description", () => {
    const { getByTestId } = renderThumb();
    expect(getByTestId("thumb").getAttribute("aria-roledescription")).toBe("Color thumb");
  });

  it("drops the tab stop when disabled", () => {
    const { getByTestId } = renderThumb({ disabled: true });
    const thumb = getByTestId("thumb");
    expect(thumb.hasAttribute("tabindex")).toBe(false);
    expect(thumb.getAttribute("data-disabled")).toBe("");
  });

  it("lets an explicit aria-label win", () => {
    const { getByTestId } = render(
      <ColorWheelRoot value={Color.parse("hsl(210, 80%, 50%)")}>
        <ColorWheelThumb data-testid="thumb" aria-label="Pick a colour" />
      </ColorWheelRoot>,
    );
    expect(getByTestId("thumb").getAttribute("aria-label")).toBe("Pick a colour");
  });
});

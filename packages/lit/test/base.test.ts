import { describe, expect, it } from "bun:test";
import { define } from "../src/base/define";
import { UrcolorPart } from "../src/base/UrcolorPart";
import { RootHostMixin } from "../src/base/RootHost";

class TestRoot extends RootHostMixin(UrcolorPart) {
  static override properties = { label: { type: String } };
  declare label: string;
}
define("test-root", TestRoot);

class TestPart extends UrcolorPart {
  renders = 0;

  override connectedCallback(): void {
    super.connectedCallback();
    this.bindRoot("test-root");
  }

  protected override update(changed: Map<string, unknown>): void {
    this.renders += 1;
    super.update(changed);
  }
}
define("test-part", TestPart);

function mount(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return { host, cleanup: () => host.remove() };
}

/**
 * Waits for every element in the tree to finish updating.
 *
 * A root's own first update ends in `notify()`, which schedules one more update
 * on each part, so awaiting a single element's `updateComplete` is not enough
 * to reach a quiet tree.
 */
async function settle(host: HTMLElement): Promise<void> {
  for (let i = 0; i < 3; i++) {
    const pending = Array.from(host.querySelectorAll("*"))
      .map(el => (el as Partial<{ updateComplete: Promise<unknown> }>).updateComplete)
      .filter((entry): entry is Promise<unknown> => Boolean(entry));
    await Promise.all(pending);
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }
}

describe("UrcolorPart", () => {
  it("keeps author children", () => {
    const { host, cleanup } = mount("<test-root><span id=\"kept\">hi</span></test-root>");
    expect(host.querySelector("#kept")).not.toBeNull();
    expect(host.querySelector("#kept")!.textContent).toBe("hi");
    cleanup();
  });

  it("finds its root through closest()", () => {
    const { host, cleanup } = mount("<test-root><test-part></test-part></test-root>");
    const part = host.querySelector("test-part") as TestPart;
    expect(part.rootElement).toBe(host.querySelector("test-root") as unknown as never);
    cleanup();
  });

  it("throws a named error when used outside its root", () => {
    const { host, cleanup } = mount("<test-part></test-part>");
    const part = host.querySelector("test-part") as TestPart;
    expect(() => part.rootElement).toThrow("test-part must be used within test-root");
    cleanup();
  });

  it("re-renders a part when the root notifies", async () => {
    const { host, cleanup } = mount("<test-root><test-part></test-part></test-root>");
    const root = host.querySelector("test-root") as TestRoot;
    const part = host.querySelector("test-part") as TestPart;
    await settle(host);
    const before = part.renders;
    root.notify();
    await settle(host);
    expect(part.renders).toBeGreaterThan(before);
    cleanup();
  });

  it("unsubscribes on disconnect", async () => {
    const { host, cleanup } = mount("<test-root><test-part></test-part></test-root>");
    const root = host.querySelector("test-root") as TestRoot;
    const part = host.querySelector("test-part") as TestPart;
    await settle(host);
    part.remove();
    const before = part.renders;
    root.notify();
    await settle(host);
    expect(part.renders).toBe(before);
    cleanup();
  });
});

describe("define", () => {
  it("is idempotent", () => {
    class Twice extends UrcolorPart {}
    expect(() => {
      define("test-twice", Twice);
      define("test-twice", Twice);
    }).not.toThrow();
  });
});

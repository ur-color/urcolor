import { ReactiveElement } from "lit";
import type { RootHost } from "./RootHost";

/** A root element: an `HTMLElement` that parts can subscribe to. */
export type RootElement = RootHost & HTMLElement;

/**
 * A light-DOM element that never renders.
 *
 * Extending `ReactiveElement` rather than `LitElement` is the whole trick:
 * reactive properties, attribute reflection and the update lifecycle all work,
 * but nothing ever writes to the element's children, so the markup the caller
 * wrote inside it survives. `LitElement` with a light-DOM render root would
 * clear it on first update.
 */
export class UrcolorPart extends ReactiveElement {
  #root: RootElement | null = null;
  #unsubscribe: (() => void) | null = null;
  #rootTag = "";

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  /**
   * Binds this part to the nearest ancestor of `tagName`. Call from
   * `connectedCallback`, after `super.connectedCallback()`.
   */
  protected bindRoot(tagName: string): void {
    this.#rootTag = tagName;
    const found = this.closest<RootElement>(tagName);
    this.#root = found;
    this.#unsubscribe = found?.subscribe(this) ?? null;
  }

  /** The bound root, or a named error explaining the misuse. */
  get rootElement(): RootElement {
    const found = this.#root
      ?? (this.#rootTag ? this.closest<RootElement>(this.#rootTag) : null);
    if (!found) {
      throw new Error(`${this.localName} must be used within ${this.#rootTag || "its root"}`);
    }
    return found;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#root = null;
  }
}

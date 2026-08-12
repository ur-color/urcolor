import { LitElement } from "lit";
import type { RootElement } from "./UrcolorPart";

/**
 * A light-DOM element that owns its entire subtree.
 *
 * Only the gradient elements qualify: they render either a canvas or a stack
 * of CSS layer spans, and never contain caller markup, so Lit clearing the
 * element's children is exactly the behaviour wanted. Everything that can hold
 * author content extends `UrcolorPart` instead, which never renders.
 */
export class UrcolorPainter extends LitElement {
  #root: RootElement | null = null;
  #unsubscribe: (() => void) | null = null;
  #rootTag = "";

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected bindRoot(tagName: string): void {
    this.#rootTag = tagName;
    const found = this.closest<RootElement>(tagName);
    this.#root = found;
    this.#unsubscribe = found?.subscribe(this) ?? null;
  }

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

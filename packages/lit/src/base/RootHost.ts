import type { ReactiveElement } from "lit";

/** A part that wants to be told when its root's state moved. */
export interface Subscriber {
  requestUpdate(): void;
}

export interface RootHost {
  subscribe(part: Subscriber): () => void;
  /** Asks every subscribed part to re-read the root and update. */
  notify(): void;
}

type Constructor<T> = new (...args: any[]) => T;

/**
 * Gives a root element a subscriber set.
 *
 * There is no context protocol here on purpose: parts find their root with
 * `closest()`, the same lookup the DOM already performs for CSS inheritance,
 * and the subscription is what turns that one-time lookup into a live one.
 */
export function RootHostMixin<T extends Constructor<ReactiveElement>>(Base: T) {
  return class RootHostElement extends Base implements RootHost {
    #subscribers = new Set<Subscriber>();

    subscribe(part: Subscriber): () => void {
      this.#subscribers.add(part);
      return () => {
        this.#subscribers.delete(part);
      };
    }

    notify(): void {
      for (const part of this.#subscribers) part.requestUpdate();
    }

    protected override updated(changed: Map<string, unknown>): void {
      super.updated(changed as never);
      this.notify();
    }
  };
}

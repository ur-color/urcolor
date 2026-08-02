import { getContext, setContext } from "svelte";

/**
 * Creates a typed `setContext`/`getContext` pair keyed by a private `Symbol`.
 *
 * `get()` throws when called outside the matching root so misuse surfaces as a
 * named error instead of an `undefined` dereference deeper in the tree.
 */
export function createContextPair<T>(name: string) {
  const key = Symbol(name);
  return {
    set(value: T): void {
      setContext(key, value);
    },
    get(): T {
      const value = getContext<T | undefined>(key);
      if (value === undefined) throw new Error(`${name}.* must be used within ${name}Root`);
      return value;
    },
  };
}

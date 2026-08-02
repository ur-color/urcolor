/**
 * Creates a typed `setContext`/`getContext` pair keyed by a private `Symbol`.
 *
 * `get()` throws when called outside the matching root so misuse surfaces as a
 * named error instead of an `undefined` dereference deeper in the tree.
 */
export declare function createContextPair<T>(name: string): {
    set(value: T): void;
    get(): T;
};

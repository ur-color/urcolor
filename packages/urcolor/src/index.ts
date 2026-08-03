/**
 * `urcolor` — the unscoped name for {@link https://npmjs.com/package/@urcolor/core | `@urcolor/core`}.
 *
 * The two packages are the same engine: this one holds no implementation, only
 * a re-export, and it depends on `@urcolor/core` by the same caret range the
 * framework adapters use, so a package manager installs one copy for all of
 * them. `import { Color } from "urcolor"` and `import { Color } from
 * "@urcolor/core"` therefore yield the *same class object* — an instance made
 * through one passes `instanceof` through the other, and a `Color` crossing
 * between an adapter (which depends on the scoped name) and application code
 * that installed the unscoped one stays a single type.
 *
 * `export *` rather than a curated list: a new export in the core is meant to
 * be reachable here without a second edit, and there is nothing this package
 * could add that the core should not have.
 */

export * from "@urcolor/core";

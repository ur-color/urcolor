/**
 * `@urcolor/preact` has no component source of its own: it is the React
 * package compiled against `preact/compat`, so a fix lands in one place.
 * The alias that makes that work lives in `vite.config.ts` and
 * `tsconfig.build.json`.
 */
export * from "../../react/src/index";

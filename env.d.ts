declare module "culori/fn" {
  export const parse: any;
  export const converter: any;
  export const formatCss: any;
  export const formatHex: any;
  export const toGamut: any;
  export const getMode: any;
  export const interpolate: any;
  export type CuloriColor = any;
  export type ModeDefinition = any;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent;
  export default component;
  export const injectColorAreaRootContext: any;
  export type ColorAreaRegionProps = any;
  export type ColorAreaRootProps = any;
  export type ColorAreaRootEmits = any;
  export type ColorAreaThumbProps = any;
  export type ColorAreaThumbXProps = any;
  export type ColorAreaThumbYProps = any;
  export type ColorAreaTrackProps = any;
}

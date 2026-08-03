import type { SpaceId } from "@urcolor/core";
import { type ColorInput, type UseColorReturn } from "./useColor.svelte.js";
/**
 * `useColor` plus one readonly getter per channel of the requested space and a
 * matching `set<Channel>` method.
 */
export type UseColorSpaceReturn<K extends string> = UseColorReturn & {
    readonly [P in K]: number;
} & {
    [P in K as `set${Capitalize<P>}`]: (value: number) => void;
};
/**
 * Reactive colour state projected onto one colour space.
 *
 * Channel values are display values (the same units the sliders use), converted
 * on read and back on write.
 */
export declare function useColorSpace<K extends string = string>(input: ColorInput, spaceName: SpaceId): UseColorSpaceReturn<K>;

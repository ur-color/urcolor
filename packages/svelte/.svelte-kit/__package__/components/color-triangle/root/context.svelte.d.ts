import type { Color, SpaceId } from "@urcolor/core";
import type { Point } from "@urcolor/shared";
/**
 * Everything a `ColorTriangle` part needs from its root.
 *
 * Every member is declared `readonly` and is published as a getter over a
 * `$derived` value, so parts read live state through a context object that is
 * itself set only once, at root initialisation.
 */
export interface ColorTriangleContextValue {
    /** The current colour. */
    readonly color: Color;
    /** The colour space all three axes operate in. */
    readonly colorSpace: SpaceId;
    /** The channel mapped to the first vertex, or `"alpha"`. */
    readonly xChannelKey: string;
    /** The channel mapped to the second vertex, or `"alpha"`. */
    readonly yChannelKey: string;
    /** The channel mapped to the third vertex, or `undefined` in two-channel mode. */
    readonly zChannelKey: string | undefined;
    /** True when a `zChannel` was supplied and the triangle is a full simplex. */
    readonly isThreeChannel: boolean;
    readonly minX: number;
    readonly maxX: number;
    readonly minY: number;
    readonly maxY: number;
    readonly minZ: number;
    readonly maxZ: number;
    /** The first channel in display units. */
    readonly valueX: number;
    /** The second channel in display units. */
    readonly valueY: number;
    /** The third channel in display units; equal to `minZ` in two-channel mode. */
    readonly valueZ: number;
    /** Rotation of the triangle, in degrees. */
    /** The three corners in normalised 0-1 space; what the outline is clipped to. */
    readonly vertices: readonly [Point, Point, Point];
    /**
     * The corners the thumb is positioned against. Identical to `vertices` unless
     * `thumbAlignment` is `"contain"`, in which case they are inset by half the
     * thumb so it never crosses an edge.
     */
    readonly positionVertices: readonly [Point, Point, Point];
    /** Whether the thumb is centred on the edge (`"overflow"`) or kept inside it. */
    readonly thumbAlignment: "contain" | "overflow";
    readonly disabled: boolean;
    /** True while a pointer drag is in flight. */
    readonly dragging: boolean;
    /**
     * Hands the thumb element to the root so the `"contain"` inset can be
     * measured against it. Returns the cleanup that unregisters it again.
     */
    registerThumb(node: HTMLElement): () => void;
}
export declare const colorTriangleContext: {
    set(value: ColorTriangleContextValue): void;
    get(): ColorTriangleContextValue;
};

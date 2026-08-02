import { createContextPair } from "../../../shared/context.js";
export const colorSwatchGroupContext = createContextPair("ColorSwatchGroup");
/**
 * The optional read: a standalone swatch is valid, so absence is not an error.
 *
 * Must be called during component initialisation, like every other context read.
 */
export function tryGetColorSwatchGroupContext() {
    try {
        return colorSwatchGroupContext.get();
    }
    catch {
        return undefined;
    }
}

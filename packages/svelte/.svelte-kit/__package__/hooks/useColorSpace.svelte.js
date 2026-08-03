import { colorSpaces, displayToNative, nativeToDisplay } from "@urcolor/shared";
import { useColor } from "./useColor.svelte.js";
/**
 * Reactive colour state projected onto one colour space.
 *
 * Channel values are display values (the same units the sliders use), converted
 * on read and back on write.
 */
export function useColorSpace(input, spaceName) {
    const base = useColor(input);
    const spaceConfig = colorSpaces[spaceName];
    const channels = $derived.by(() => {
        if (!spaceConfig)
            return {};
        const converted = base.color.to(spaceConfig.space);
        const result = {};
        for (const ch of spaceConfig.channels) {
            result[ch.key] = nativeToDisplay(ch, converted.get(ch.key));
        }
        return result;
    });
    const result = {
        get color() {
            return base.color;
        },
        setColor: base.setColor,
        get hex() {
            return base.hex;
        },
        setHex: base.setHex,
        get alpha() {
            return base.alpha;
        },
        setAlpha: base.setAlpha,
    };
    if (spaceConfig) {
        for (const ch of spaceConfig.channels) {
            Object.defineProperty(result, ch.key, {
                enumerable: true,
                get: () => channels[ch.key],
            });
            const capitalized = ch.key.charAt(0).toUpperCase() + ch.key.slice(1);
            result[`set${capitalized}`] = (value) => {
                base.setColor(prev => prev.with({ space: spaceConfig.space, [ch.key]: displayToNative(ch, value) }));
            };
        }
    }
    return result;
}

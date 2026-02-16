export interface ChannelConfig {
    /** culori channel key (e.g. 'h', 's', 'l') */
    key: string;
    /** Human-readable label */
    label: string;
    /** Display minimum value */
    min: number;
    /** Display maximum value */
    max: number;
    /** Step increment (in display units) */
    step: number;
    /** Display format */
    format: "number" | "degree" | "percentage";
    /** culori internal minimum (defaults to min if not set) */
    culoriMin?: number;
    /** culori internal maximum (defaults to max if not set) */
    culoriMax?: number;
}
export interface ColorSpaceConfig {
    /** culori mode identifier */
    mode: string;
    /** Human-readable label */
    label: string;
    /** Channel definitions */
    channels: ChannelConfig[];
}
/** Convert a display value to culori internal value */
export declare function displayToCulori(config: ChannelConfig, displayValue: number): number;
/** Convert a culori internal value to display value, rounded to step precision */
export declare function culoriToDisplay(config: ChannelConfig, culoriValue: number): number;
export declare const colorSpaces: Record<string, ColorSpaceConfig>;
/**
 * Get channel config for a specific channel in a color space.
 */
export declare function getChannelConfig(colorSpace: string, channel: string): ChannelConfig | undefined;

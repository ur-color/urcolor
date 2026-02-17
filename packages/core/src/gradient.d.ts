import "internationalized-color/css";
import { Color } from "internationalized-color";
/**
 * Draw a smooth linear gradient on a canvas using WebGL.
 *
 * Colors are interpolated in sRGB space on the GPU.
 * All input colors can be in any color space — they are converted to
 * sRGB before being sent to the shader.
 *
 * @param canvas - The target canvas element.
 * @param colors - Array of color stops (2–16 colors).
 * @param vertical - If true, gradient runs top-to-bottom instead of left-to-right.
 */
export declare function drawLinearGradient(canvas: HTMLCanvasElement, colors: Color[], angle?: number, alpha?: boolean, mirrorX?: boolean, mirrorY?: boolean): void;
/**
 * Interpolate between an array of colors in a given color space,
 * producing `steps` intermediate sRGB Color values.
 */
export declare function interpolateStops(colors: Color[], steps: number, space: string): Color[];
/**
 * Sample a bilinear grid in a target color space, outputting RGBA pixels.
 * The four corner colors are interpolated in `space`, then converted to sRGB.
 */
export declare function sampleBilinearGrid(tl: Color, tr: Color, bl: Color, br: Color, w: number, h: number, space: string, alpha?: boolean): Uint8ClampedArray;
/**
 * Sample a 2D grid by directly computing color values for each (x, y) position.
 * Unlike sampleBilinearGrid which interpolates 4 corners, this evaluates the
 * actual color at each grid point — essential for cyclic channels like hue.
 */
export declare function sampleChannelGrid(baseColor: Color, colorSpace: string, xChannel: string, yChannel: string, xMin: number, xMax: number, yMin: number, yMax: number, w: number, h: number, alpha?: boolean): Uint8ClampedArray;
/**
 * Draw a smooth bilinear gradient on a canvas using WebGL.
 *
 * The four corner colors are interpolated in sRGB space on the GPU.
 * All input colors can be in any color space — they are converted to
 * sRGB before being sent to the shader.
 *
 * The canvas is resized to match its CSS layout size × devicePixelRatio.
 *
 * @param canvas - The target canvas element.
 * @param topLeft - Color for the top-left corner.
 * @param topRight - Color for the top-right corner.
 * @param bottomLeft - Color for the bottom-left corner.
 * @param bottomRight - Color for the bottom-right corner.
 */
export declare function drawGradient(canvas: HTMLCanvasElement, topLeft: Color, topRight: Color, bottomLeft: Color, bottomRight: Color, alpha?: boolean, mirrorX?: boolean, mirrorY?: boolean): void;

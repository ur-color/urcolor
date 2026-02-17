export interface Point {
  x: number;
  y: number;
}
export interface PolarCoord {
  angle: number;
  radius: number;
}
export declare function polarToCartesian(angle: number, radius: number, cx: number, cy: number): Point;
export declare function cartesianToPolar(x: number, y: number, cx: number, cy: number): PolarCoord;
export declare function clampToCircle(x: number, y: number, cx: number, cy: number, r: number): Point;
export declare function normalizeAngle(angle: number, startAngle?: number): number;
export declare function triangleVertices(width: number, height: number, rotation?: number): [Point, Point, Point];
export declare function barycentricCoords(x: number, y: number, v0: Point, v1: Point, v2: Point): { u: number; v: number; w: number };
export declare function barycentricToCartesian(u: number, v: number, w: number, v0: Point, v1: Point, v2: Point): Point;
export declare function pointInTriangle(x: number, y: number, v0: Point, v1: Point, v2: Point): boolean;
export declare function clampToTriangle(x: number, y: number, v0: Point, v1: Point, v2: Point): Point;

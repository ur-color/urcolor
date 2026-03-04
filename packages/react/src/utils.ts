export function clamp(value: number, min: number = Number.NEGATIVE_INFINITY, max: number = Number.POSITIVE_INFINITY): number {
  return Math.min(max, Math.max(min, value));
}

export function getDecimalCount(value: number) {
  return (String(value).split(".")[1] || "").length;
}

export function roundValue(value: number, decimalCount: number) {
  const rounder = 10 ** decimalCount;
  return Math.round(value * rounder) / rounder;
}

export function snapToStep(value: number, min: number, max: number, step: number): number {
  const decimalCount = getDecimalCount(step);
  const snapped = roundValue(Math.round((value - min) / step) * step + min, decimalCount);
  return clamp(snapped, min, max);
}

export function linearScale(input: readonly [number, number], output: readonly [number, number]) {
  return (value: number) => {
    if (input[0] === input[1] || output[0] === output[1])
      return output[0];
    const ratio = (output[1] - output[0]) / (input[1] - input[0]);
    return output[0] + ratio * (value - input[0]);
  };
}

export function convertValueToPercentage(value: number, min: number, max: number) {
  const maxSteps = max - min;
  const percentPerStep = 100 / maxSteps;
  const percentage = percentPerStep * (value - min);
  return clamp(percentage, 0, 100);
}

export function getThumbInBoundsOffset(width: number, left: number, direction: number) {
  const halfWidth = width / 2;
  const halfPercent = 50;
  const offset = linearScale([0, halfPercent], [0, halfWidth]);
  return (halfWidth - offset(left) * direction) * direction;
}

export function getClosestThumbIndex(values: number[][], point: number[], minX: number, maxX: number, minY: number, maxY: number): number {
  if (values.length === 0) return -1;
  if (values.length === 1) return 0;
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const distances = values.map((value) => {
    const dx = (value[0]! - point[0]!) / rangeX;
    const dy = (value[1]! - point[1]!) / rangeY;
    return Math.sqrt(dx * dx + dy * dy);
  });
  const closestDistance = Math.min(...distances);
  return distances.indexOf(closestDistance);
}

export function hasMinStepsBetweenValues(values: number[], minStepsBetweenValues: number) {
  if (minStepsBetweenValues > 0) {
    const stepsBetweenValues = values.slice(0, -1).map((value, index) => values[index + 1]! - value);
    const actualMinStepsBetweenValues = Math.min(...stepsBetweenValues);
    return actualMinStepsBetweenValues >= minStepsBetweenValues;
  }
  return true;
}

export const PAGE_KEYS = ["PageUp", "PageDown"];
export const ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

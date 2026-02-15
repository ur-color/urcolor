import type { MaybeElementRef } from "@vueuse/core";
import type { PropType, Ref } from "vue";
import { unrefElement } from "@vueuse/core";
import { computed, defineComponent, h, inject, markRaw, onMounted, provide, ref, toValue, watch, watchEffect } from "vue";
import { createContext, Slot } from "reka-ui";

export type ActiveDirection = "x" | "y";

export interface ColorAreaThumbContext {
  index: Ref<number>;
}

export const [injectColorAreaThumbContext, provideColorAreaThumbContext]
  = createContext<ColorAreaThumbContext>("ColorAreaThumb");

// --- Math utilities ---

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

/**
 * Snap a value to the nearest step, then clamp it within [min, max].
 */
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

export function getLabel(index: number, totalValues: number) {
  if (totalValues > 2)
    return `Value ${index + 1} of ${totalValues}`;
  else if (totalValues === 2)
    return ["Minimum", "Maximum"][index];
  else
    return undefined;
}

export function getThumbInBoundsOffset(width: number, left: number, direction: number) {
  const halfWidth = width / 2;
  const halfPercent = 50;
  const offset = linearScale([0, halfPercent], [0, halfWidth]);
  return (halfWidth - offset(left) * direction) * direction;
}

function getStepsBetweenValues(values: number[]) {
  return values.slice(0, -1).map((value, index) => values[index + 1]! - value);
}

export function hasMinStepsBetweenValues(values: number[], minStepsBetweenValues: number) {
  if (minStepsBetweenValues > 0) {
    const stepsBetweenValues = getStepsBetweenValues(values);
    const actualMinStepsBetweenValues = Math.min(...stepsBetweenValues);
    return actualMinStepsBetweenValues >= minStepsBetweenValues;
  }
  return true;
}

/**
 * Find the closest thumb to a given point using Euclidean distance.
 */
export function getClosestThumbIndex(values: number[][], point: number[], minX: number, maxX: number, minY: number, maxY: number): number {
  if (values.length === 0)
    return -1;
  if (values.length === 1)
    return 0;

  // Normalize distances to account for different axis ranges
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

export const PAGE_KEYS = ["PageUp", "PageDown"];
export const ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

// --- Composables ---

export function useFormControl(el: MaybeElementRef) {
  return computed(() => toValue(el) ? Boolean(unrefElement(el)?.closest("form")) : true);
}

export function useSize(element: MaybeElementRef) {
  const size = ref<{ width: number; height: number }>();
  const width = computed(() => size.value?.width ?? 0);
  const height = computed(() => size.value?.height ?? 0);

  onMounted(() => {
    const el = unrefElement(element) as HTMLElement;
    if (el) {
      size.value = { width: el.offsetWidth, height: el.offsetHeight };

      const resizeObserver = new ResizeObserver((entries) => {
        if (!Array.isArray(entries) || !entries.length)
          return;
        const entry = entries[0]!;
        let w: number;
        let h: number;
        if ("borderBoxSize" in entry) {
          const borderSizeEntry = entry.borderBoxSize;
          const borderSize = Array.isArray(borderSizeEntry) ? borderSizeEntry[0] : borderSizeEntry;
          w = borderSize.inlineSize;
          h = borderSize.blockSize;
        } else {
          w = el.offsetWidth;
          h = el.offsetHeight;
        }
        size.value = { width: w, height: h };
      });

      resizeObserver.observe(el, { box: "border-box" });
    } else {
      size.value = undefined;
    }
  });

  return { width, height };
}

// --- Collection ---

const ITEM_DATA_ATTR = "data-reka-collection-item";

interface CollectionContext<ItemData = {}> {
  collectionRef: Ref<HTMLElement | undefined>;
  itemMap: Ref<Map<HTMLElement, { ref: HTMLElement } & ItemData>>;
}

export function useCollection<ItemData = {}>(options: { key?: string; isProvider?: boolean } = {}) {
  const { key = "", isProvider = false } = options;
  const injectionKey = `${key}CollectionProvider`;
  let context: CollectionContext<ItemData>;

  if (isProvider) {
    const itemMap = ref<Map<HTMLElement, { ref: HTMLElement } & ItemData>>(new Map()) as Ref<Map<HTMLElement, { ref: HTMLElement } & ItemData>>;
    const collectionRef = ref<HTMLElement>();

    context = { collectionRef, itemMap } as CollectionContext<ItemData>;
    provide(injectionKey, context);
  } else {
    context = inject(injectionKey) as CollectionContext<ItemData>;
  }

  const getItems = (includeDisabledItem = false) => {
    const collectionNode = context.collectionRef.value;
    if (!collectionNode)
      return [];
    const orderedNodes = Array.from(collectionNode.querySelectorAll(`[${ITEM_DATA_ATTR}]`));
    const items = Array.from(context.itemMap.value.values());
    const orderedItems = items.sort(
      (a, b) => orderedNodes.indexOf(a.ref) - orderedNodes.indexOf(b.ref),
    );
    if (includeDisabledItem)
      return orderedItems;
    else
      return orderedItems.filter(i => i.ref.dataset.disabled !== "");
  };

  const CollectionSlot = defineComponent({
    name: "CollectionSlot",
    inheritAttrs: false,
    setup(_, { slots, attrs }) {
      const { primitiveElement, currentElement } = usePrimitiveElement();
      watch(currentElement, () => {
        context.collectionRef.value = currentElement.value;
      });
      return () => h(Slot, { ref: primitiveElement, ...attrs }, slots);
    },
  });

  const CollectionItem = defineComponent({
    name: "CollectionItem",
    inheritAttrs: false,
    props: {
      value: {
        type: [String, Number, Boolean, Object, Array, Function] as PropType<unknown>,
        default: undefined,
        validator: () => true,
      },
    },
    setup(props, { slots, attrs }) {
      const { primitiveElement, currentElement } = usePrimitiveElement();

      watchEffect((cleanupFn) => {
        if (currentElement.value) {
          const key = markRaw(currentElement.value);
          context.itemMap.value.set(key, { ref: currentElement.value, value: props.value } as any);
          cleanupFn(() => context.itemMap.value.delete(key));
        }
      });

      return () => h(Slot, { ...attrs, [ITEM_DATA_ATTR]: "", ref: primitiveElement }, slots);
    },
  });

  const reactiveItems = computed(() => Array.from(context.itemMap.value.values()));
  const itemMapSize = computed(() => context.itemMap.value.size);

  return { getItems, reactiveItems, itemMapSize, CollectionSlot, CollectionItem };
}

function usePrimitiveElement() {
  const currentElement = ref<HTMLElement>();
  const primitiveElement = (el: any) => {
    if (el) {
      const htmlEl = el instanceof Element ? el : el?.$el;
      if (htmlEl instanceof Element)
        currentElement.value = htmlEl as HTMLElement;
    }
  };
  return { primitiveElement, currentElement };
}

import type { MaybeElementRef } from "@vueuse/core";
import type { PropType, Ref } from "vue";
import { unrefElement } from "@vueuse/core";
import { computed, defineComponent, h, inject, markRaw, onMounted, provide, ref, toValue, watch, watchEffect } from "vue";
import { Slot } from "reka-ui";

export type ActiveDirection = "x" | "y";

// --- Math utilities ---
//
// These live in `@urcolor/primitives` so the framework packages share one
// implementation; they are re-exported here because every call site inside
// this package already imports them from `shared/utils`.

export {
  clamp,
  convertValueToPercentage,
  getClosestThumbIndex,
  getDecimalCount,
  getLabel,
  getThumbInBoundsOffset,
  hasMinStepsBetweenValues,
  linearScale,
  roundValue,
  snapToStep,
} from "@urcolor/primitives";

/**
 * Wrap a value cyclically into [min, max), used for angular channels such as hue
 * where stepping past 360 should land back near 0 rather than clamping.
 */
export function cyclicWrap(value: number, min: number, max: number): number {
  const range = max - min;
  if (range <= 0)
    return min;
  return ((value - min) % range + range) % range + min;
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

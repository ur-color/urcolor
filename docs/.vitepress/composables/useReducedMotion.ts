import type { Ref } from "vue";
import { onMounted, onUnmounted, ref } from "vue";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Reads the OS reduced-motion preference and keeps tracking it. Starts `false`
 * so that server-rendered markup matches the common case; `onMounted` corrects
 * it before any animation is scheduled.
 */
export function useReducedMotion(): Ref<boolean> {
  const reduced = ref(false);
  let mq: MediaQueryList | undefined;
  const sync = () => {
    reduced.value = mq?.matches ?? false;
  };

  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    mq = window.matchMedia(QUERY);
    sync();
  }

  onMounted(() => {
    if (!mq && typeof window !== "undefined" && typeof window.matchMedia === "function") {
      mq = window.matchMedia(QUERY);
    }
    sync();
    mq?.addEventListener("change", sync);
  });

  onUnmounted(() => mq?.removeEventListener("change", sync));

  return reduced;
}

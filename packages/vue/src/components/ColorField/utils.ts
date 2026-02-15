import type { Ref } from "vue";
import { ref, onUnmounted } from "vue";

export function usePressedHold(options: {
  disabled: Ref<boolean>;
  onTrigger: () => void;
}) {
  const { disabled, onTrigger } = options;
  const isPressed = ref(false);
  let timeout: ReturnType<typeof setTimeout> | undefined;

  function resetTimeout() {
    if (timeout !== undefined) {
      clearTimeout(timeout);
      timeout = undefined;
    }
  }

  function startPress(delay: number) {
    resetTimeout();
    if (disabled.value) return;
    onTrigger();
    timeout = setTimeout(() => startPress(60), delay);
  }

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0 || isPressed.value || disabled.value) return;
    event.preventDefault();
    isPressed.value = true;
    startPress(400);

    const onPointerUp = () => {
      isPressed.value = false;
      resetTimeout();
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };

    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }

  if (typeof window !== "undefined") {
    // We need the component's root element — attach via event delegation
    // The component template should have @pointerdown but we use this composable pattern
    // Return onPointerDown so the component can bind it
  }

  onUnmounted(resetTimeout);

  return { isPressed, onPointerDown };
}

import { ref } from "vue";

const brandHue = ref(328);

export function useBrandHue() {
  return brandHue;
}

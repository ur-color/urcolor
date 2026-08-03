import type { ComputedRef, InjectionKey, Ref } from "vue";
import { computed, inject, provide } from "vue";

const DOCS_LANG_KEY: InjectionKey<ComputedRef<string>> = Symbol("docs-lang");

/** The base subtag, e.g. `"zh"` for `"zh-CN"`. */
function baseSubtag(lang: string): string {
  return lang.split("-")[0]!.toLowerCase();
}

/**
 * Published by the theme layout, which is the only component that has the
 * page's locale — and the only one that should import vitepress's client
 * surface for it. Everything below reads it through {@link useDocsLang}, so the
 * hero and its readouts stay mountable in a unit test with no vitepress mock.
 */
export function provideDocsLang(lang: Ref<string> | ComputedRef<string>): void {
  provide(DOCS_LANG_KEY, computed(() => baseSubtag(lang.value)));
}

/** The page's language, defaulting to English outside a provided tree. */
export function useDocsLang(): ComputedRef<string> {
  return inject(DOCS_LANG_KEY, computed(() => "en"));
}

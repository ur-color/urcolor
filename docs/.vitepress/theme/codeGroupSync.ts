/**
 * Keeps every code group on the page on the same tab.
 *
 * VitePress renders each `::: code-group` as its own radio group, so picking
 * "React" in one block leaves the next block on "Vue" — which makes a page of
 * per-step snippets unreadable for anyone not using the default framework.
 *
 * Groups are matched by their *set* of tab labels, so Vue/React groups sync with
 * each other and bun/npm/pnpm/yarn groups sync with each other, without one kind
 * ever driving the other. The choice is remembered per label set, so the same
 * framework is selected on the next page and the next visit.
 */

const STORAGE_PREFIX = "urcolor:code-group:";

function labelsOf(group: Element): string[] {
  return [...group.querySelectorAll(":scope > .tabs > label")]
    .map(l => l.textContent?.trim() ?? "");
}

/** Identifies a kind of group, e.g. `"react|vue"`. Order-insensitive. */
function keyOf(labels: string[]): string {
  return [...labels].map(l => l.toLowerCase()).sort().join("|");
}

/**
 * Switches one group to a tab, by hand rather than by synthesising a click.
 *
 * VitePress's own tab handler ends with `label.scrollIntoView()`, so clicking
 * the inputs of the other groups would drag the viewport down to whichever
 * group was synced last — and checking a radio focuses it, which scrolls too.
 * Doing the same two state changes it does (check the input, move the `active`
 * class) leaves the scroll position alone.
 */
function selectIn(group: Element, label: string): void {
  const index = labelsOf(group).indexOf(label);
  if (index < 0) return;

  const input = group.querySelectorAll<HTMLInputElement>(":scope > .tabs > input")[index];
  if (!input || input.checked) return;
  input.checked = true;

  const blocks = group.querySelector(":scope > .blocks");
  const next = blocks?.children[index];
  if (!next) return;
  for (const block of blocks!.children) block.classList.remove("active");
  next.classList.add("active");
}

function apply(label: string, key: string, source?: Element): void {
  for (const group of document.querySelectorAll(".vp-code-group")) {
    if (group === source) continue;
    if (keyOf(labelsOf(group)) !== key) continue;
    selectIn(group, label);
  }
}

/** Re-selects each group's remembered tab. */
export function restoreCodeGroups(): void {
  for (const group of document.querySelectorAll(".vp-code-group")) {
    const labels = labelsOf(group);
    if (labels.length < 2) continue;
    const stored = localStorage.getItem(STORAGE_PREFIX + keyOf(labels));
    if (stored && labels.includes(stored)) selectIn(group, stored);
  }
}

/**
 * Restores tabs whenever the page grows a new set of code groups.
 *
 * Scheduling is deliberately timer-based rather than `requestAnimationFrame`:
 * a background tab stops painting, and a reader who opens several pages in
 * background tabs would come back to every one of them reset to the default
 * framework. Timers still run there.
 *
 * The observer covers client-side navigation and the asynchronously mounted
 * page component; the initial sweep covers a cold load whose content is already
 * in the DOM before the theme runs.
 */
function watchCodeGroups(): void {
  let known = document.querySelectorAll(".vp-code-group").length;
  let queued: ReturnType<typeof setTimeout> | undefined;

  function check() {
    queued = undefined;
    const count = document.querySelectorAll(".vp-code-group").length;
    if (count === known) return;
    known = count;
    restoreCodeGroups();
  }

  const observer = new MutationObserver(() => {
    if (queued !== undefined) return;
    queued = setTimeout(check, 0);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

export function installCodeGroupSync(): void {
  watchCodeGroups();
  restoreCodeGroups();

  document.addEventListener("change", (event) => {
    const input = event.target as HTMLElement | null;
    if (!(input instanceof HTMLInputElement) || input.type !== "radio") return;
    const group = input.closest(".vp-code-group");
    if (!group) return;

    const label = group.querySelector(`:scope > .tabs > label[for="${CSS.escape(input.id)}"]`);
    const text = label?.textContent?.trim();
    if (!text) return;

    const key = keyOf(labelsOf(group));
    try {
      localStorage.setItem(STORAGE_PREFIX + key, text);
    } catch {
      // Private-mode storage failures are not worth breaking the sync over.
    }
    apply(text, key, group);
  });
}

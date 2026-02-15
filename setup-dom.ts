import { Window } from "happy-dom";

const win = new Window({ url: "http://localhost" });
(globalThis as Record<string, unknown>).window = win;
(globalThis as Record<string, unknown>).document = win.document;
(globalThis as Record<string, unknown>).navigator = win.navigator;

for (const key of Object.getOwnPropertyNames(win)) {
  if (!(key in globalThis)) {
    try {
      (globalThis as Record<string, unknown>)[key] = (win as unknown as Record<string, unknown>)[key];
    } catch { /* ignore */ }
  }
}

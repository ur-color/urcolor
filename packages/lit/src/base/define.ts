/**
 * Registers an element, tolerating a second import of the same module.
 *
 * A bundler that ships two copies of this package would otherwise throw on the
 * duplicate name and take the whole page down; a color picker is not worth
 * that.
 */
export function define(name: string, ctor: CustomElementConstructor): void {
  if (customElements.get(name)) return;
  customElements.define(name, ctor);
}

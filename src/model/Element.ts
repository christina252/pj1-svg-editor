import type { Container } from './Container.ts';

/**
 * Base class of every node of the SVG document tree.
 *
 * Two kinds of behaviour are defined by subclasses:
 * - the *composite* operations `translate` / `scaleBy` / `setAttribute`, so the
 *   command layer never has to ask "is this a group or a leaf?" (spec §2.1);
 * - the *display* operations `summary` / `detailLines`, so `tree` and `show`
 *   need no per-type branch either.
 */
export abstract class Element {
  readonly id: string;

  readonly #attributes = new Map<string, string>();
  #parent: Container | null = null;

  protected constructor(id: string) {
    this.id = id;
  }

  /** SVG element name, e.g. `rect`, `g`, `svg`. */
  abstract get tagName(): string;

  /** True for elements whose geometry this editor understands (D12). */
  abstract get isGeometric(): boolean;

  get parent(): Container | null {
    return this.#parent;
  }

  /** Called by Container when this element enters or leaves a child list. */
  attachTo(parent: Container | null): void {
    this.#parent = parent;
  }

  /** Display label used by `tree` / `show`, e.g. `rect#bg`. */
  label(): string {
    return `${this.tagName}#${this.id}`;
  }

  /** Attributes in output order; `id` and the text content are handled apart. */
  attributes(): ReadonlyMap<string, string> {
    return this.#attributes;
  }

  /** Inline attribute summary for `tree` (spec §5.1). */
  abstract summary(): string;

  /** Attribute lines for `show`, without the header line (spec §5.2). */
  abstract detailLines(): string[];

  /** Composite: a leaf shifts its own geometry, a container shifts its subtree. */
  abstract translate(dx: number, dy: number): void;

  /** Composite: a leaf scales its own geometry, a container scales its subtree. */
  abstract scaleBy(factor: number): void;

  /** Throws EditorError for attributes outside the whitelist (R-E5, R-ERR13). */
  abstract setAttribute(name: string, value: string): void;

  /** Visits this element and, for containers, every descendant (document order). */
  abstract walk(visit: (element: Element) => void): void;

  /** Every element of this subtree except this one, in document order. */
  descendants(): Element[] {
    const result: Element[] = [];
    this.walk((element) => {
      if (element !== this) {
        result.push(element);
      }
    });
    return result;
  }

  /** True when `element` is this element or one of its descendants. */
  contains(element: Element): boolean {
    let found = false;
    this.walk((candidate) => {
      if (candidate === element) {
        found = true;
      }
    });
    return found;
  }

  protected put(name: string, value: string): void {
    this.#attributes.set(name, value);
  }

  protected raw(name: string): string | undefined {
    return this.#attributes.get(name);
  }

  protected has(name: string): boolean {
    return this.#attributes.has(name);
  }
}

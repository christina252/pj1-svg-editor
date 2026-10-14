import { EditorError } from '../errors/EditorError.ts';
import { Element } from './Element.ts';

/**
 * Base class of every element that can hold children (`<g>`, and the `<svg>` root).
 *
 * This is the "composite" half of the Composite pattern (spec §2.1): the same
 * `translate` / `scaleBy` / `setAttribute` calls work on a container and on a
 * leaf, so no command ever needs to know which one it is holding.
 */
export abstract class Container extends Element {
  readonly #children: Element[] = [];

  protected constructor(id: string) {
    super(id);
  }

  /** Children in document order — the order they are painted in. */
  get children(): readonly Element[] {
    return this.#children;
  }

  /** Adds a child at the end of the child list. */
  append(child: Element): void {
    this.insertAt(this.#children.length, child);
  }

  /**
   * Inserts a child at a given position.
   *
   * A child that already lives somewhere else is detached first, and a move
   * that would put a container inside itself is refused (R-ERR18).
   */
  insertAt(index: number, child: Element): void {
    if (child.contains(this)) {
      throw EditorError.cannotMoveIntoDescendant(child.id);
    }
    const previousParent = child.parent;
    if (previousParent !== null) {
      previousParent.removeChild(child);
    }
    this.#children.splice(index, 0, child);
    child.attachTo(this);
  }

  /** Removes a child and returns the position it had (used to undo a delete). */
  removeChild(child: Element): number {
    const index = this.#children.indexOf(child);
    if (index < 0) {
      throw new Error(`internal error: ${child.label()} is not a child of ${this.label()}`);
    }
    this.#children.splice(index, 1);
    child.attachTo(null);
    return index;
  }

  indexOf(child: Element): number {
    return this.#children.indexOf(child);
  }

  override translate(dx: number, dy: number): void {
    for (const child of this.#children) {
      child.translate(dx, dy);
    }
  }

  override scaleBy(factor: number): void {
    for (const child of this.#children) {
      child.scaleBy(factor);
    }
  }

  override walk(visit: (element: Element) => void): void {
    visit(this);
    for (const child of this.#children) {
      child.walk(visit);
    }
  }

  /** A container has no geometry of its own to show inline (spec §5.1). */
  override summary(): string {
    return '';
  }

  override detailLines(): string[] {
    return [];
  }

  override setAttribute(name: string, _value: string): void {
    throw EditorError.unknownAttribute(name);
  }
}

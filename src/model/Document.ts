import { Container } from './Container.ts';
import type { Element } from './Element.ts';
import { NumberFormat } from './NumberFormat.ts';

/**
 * The current document: the `<svg>` root element plus the bookkeeping the
 * commands need (canvas size, where it was read from, id lookups).
 *
 * The root has no id of its own — `label()` is just `svg`, which is what the
 * tree display shows (spec §5.1) — and it is deliberately not addressable:
 * `set svg …` must fail with "no such shape".
 *
 * Id uniqueness is answered by walking the tree instead of maintaining a
 * second, mutable registry (D14): a tree and a registry cannot drift apart if
 * there is only one of them.
 */
export class Document extends Container {
  static readonly DEFAULT_WIDTH = 800;
  static readonly DEFAULT_HEIGHT = 600;

  #width: number;
  #height: number;
  #viewBox: string | null = null;
  #sourcePath: string | null = null;

  private constructor(width: number, height: number) {
    super('');
    this.#width = width;
    this.#height = height;
  }

  /** A new, empty canvas (`init [w] [h]`). */
  static blank(width: number = Document.DEFAULT_WIDTH, height: number = Document.DEFAULT_HEIGHT): Document {
    return new Document(width, height);
  }

  override get tagName(): string {
    return 'svg';
  }

  override get isGeometric(): boolean {
    return true;
  }

  override label(): string {
    return 'svg';
  }

  /** `800x600` — used by `canvas`, `tree` and the save summary. */
  get size(): string {
    return `${NumberFormat.format(this.#width)}x${NumberFormat.format(this.#height)}`;
  }

  get width(): number {
    return this.#width;
  }

  get height(): number {
    return this.#height;
  }

  /** `canvas <w> <h>`: resizing regenerates the viewBox (D17). */
  resize(width: number, height: number): void {
    this.#width = width;
    this.#height = height;
    this.#viewBox = null;
  }

  get viewBox(): string {
    return this.#viewBox ?? `0 0 ${NumberFormat.format(this.#width)} ${NumberFormat.format(this.#height)}`;
  }

  /** A viewBox read from a file is kept as-is until the canvas is resized (D17). */
  setViewBox(raw: string | null): void {
    this.#viewBox = raw;
  }

  get sourcePath(): string | null {
    return this.#sourcePath;
  }

  setSourcePath(path: string | null): void {
    this.#sourcePath = path;
  }

  /** `svg (800x600)` — the root line of the tree display. */
  override summary(): string {
    return `(${this.size})`;
  }

  find(id: string): Element | undefined {
    if (id === '') {
      return undefined;
    }
    return this.descendants().find((element) => element.id === id);
  }

  hasId(id: string): boolean {
    return this.find(id) !== undefined;
  }

  /** `rect` → `rect1` (or the first free number) for unnamed input elements (R-C4). */
  nextFreeId(tagName: string): string {
    for (let index = 1; ; index += 1) {
      const candidate = `${tagName}${index}`;
      if (!this.hasId(candidate)) {
        return candidate;
      }
    }
  }

  /** Number of elements below the root — `saved to demo.svg (5 elements)`. */
  elementCount(): number {
    return this.descendants().length;
  }
}

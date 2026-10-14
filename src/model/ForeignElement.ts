import { EditorError } from '../errors/EditorError.ts';
import { Container } from './Container.ts';

/**
 * Any element this phase does not model (`<path>`, `<defs>`, `<title>`, …).
 *
 * Decision D8/D12: reading a file must not lose content, so foreign elements
 * keep their tag, their attributes and their whole subtree and are written back
 * unchanged. They are addressable like everything else (`tree`, `delete`,
 * `group`, `front`), but the editor does not pretend to understand their
 * geometry: `move`/`scale`/`set` on them directly is refused, while a move of an
 * ancestor container simply leaves them untouched.
 */
export class ForeignElement extends Container {
  readonly #tag: string;

  constructor(id: string, tag: string, attributes: ReadonlyMap<string, string> = new Map()) {
    super(id);
    this.#tag = tag;
    for (const [name, value] of attributes) {
      this.put(name, value);
    }
  }

  override get tagName(): string {
    return this.#tag;
  }

  override get isGeometric(): boolean {
    return false;
  }

  override summary(): string {
    return '(foreign)';
  }

  override translate(_dx: number, _dy: number): void {
    // Preserved verbatim: no geometry is interpreted here (D12).
  }

  override scaleBy(_factor: number): void {
    // Preserved verbatim: no geometry is interpreted here (D12).
  }

  override setAttribute(_name: string, _value: string): void {
    throw EditorError.unsupportedElement(this.id);
  }
}

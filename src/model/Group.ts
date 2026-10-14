import { EditorError } from '../errors/EditorError.ts';
import { Container } from './Container.ts';
import { StyleAttributes } from './StyleAttributes.ts';

/**
 * `<g>` — a plain group container.
 *
 * It accepts the inheritable style attributes (D9) but has no geometry of its
 * own: moving or scaling a group means moving or scaling its children.
 */
export class Group extends Container {
  constructor(id: string) {
    super(id);
  }

  override get tagName(): string {
    return 'g';
  }

  override get isGeometric(): boolean {
    return true;
  }

  override setAttribute(name: string, value: string): void {
    if (StyleAttributes.includes(name)) {
      this.put(name, value);
      return;
    }
    throw EditorError.unknownAttribute(name);
  }
}

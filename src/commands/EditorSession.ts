import { EditorError } from '../errors/EditorError.ts';
import type { Container } from '../model/Container.ts';
import type { Document } from '../model/Document.ts';
import type { Element } from '../model/Element.ts';

/**
 * The state a command works on: which document is currently open.
 *
 * Commands never create documents themselves — they ask the session. That is
 * what makes `error: no document. use 'init' or 'read' first` (R-ERR11) a
 * one-line rule instead of a check repeated in every command.
 */
export class EditorSession {
  #document: Document | null = null;

  get document(): Document | null {
    return this.#document;
  }

  get hasDocument(): boolean {
    return this.#document !== null;
  }

  /** The current document, or the specification's error when there is none. */
  requireDocument(): Document {
    if (this.#document === null) {
      throw EditorError.noDocument();
    }
    return this.#document;
  }

  /** Looks an element up by id (R-ERR2), so every command reports it the same way. */
  requireElement(id: string): Element {
    const element = this.requireDocument().find(id);
    if (element === undefined) {
      throw EditorError.noSuchShape(id);
    }
    return element;
  }

  /**
   * Looks a container up by id (R-ERR2 / R-ERR4).
   *
   * The cast below is the one place where "checked at runtime, typed statically"
   * meets: `isContainer` is the model's own answer, so it cannot disagree with
   * the class of the object.
   */
  requireContainer(id: string): Container {
    const element = this.requireElement(id);
    if (!element.isContainer) {
      throw EditorError.notAContainer(id);
    }
    return element as Container;
  }

  /** Makes `document` the current one (`init` and `read` do this). */
  setDocument(document: Document): void {
    this.#document = document;
  }
}

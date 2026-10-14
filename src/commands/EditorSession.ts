import { EditorError } from '../errors/EditorError.ts';
import type { Document } from '../model/Document.ts';

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

  /** Makes `document` the current one (`init` and `read` do this). */
  setDocument(document: Document): void {
    this.#document = document;
  }
}

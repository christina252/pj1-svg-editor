import { EditorError } from '../errors/EditorError.ts';
import type { Edit } from './Edit.ts';

/**
 * The undo / redo stacks (spec §3, §4.3, R-U1…R-U4).
 *
 * Rules encoded here — and nowhere else:
 * - one editing command = one unit (`group g1 r1 c1 t1` is undone at once);
 * - a new edit clears the redo stack (R-U2);
 * - `init` / `read` / `save` / `canvas <w> <h>` lock undo/redo until the next
 *   edit command (R-U3), because they replace or persist the document;
 * - display commands never call `push`, so they never enter the stack (R-U4);
 * - an empty stack answers rather than doing nothing (D16).
 */
export class History {
  readonly #undoStack: Edit[] = [];
  readonly #redoStack: Edit[] = [];
  #lockedByIo = false;

  get undoDepth(): number {
    return this.#undoStack.length;
  }

  get redoDepth(): number {
    return this.#redoStack.length;
  }

  /** Records a completed edit and re-enables undo after an io command. */
  push(edit: Edit): void {
    this.#undoStack.push(edit);
    this.#redoStack.length = 0;
    this.#lockedByIo = false;
  }

  /**
   * Called by the document commands.
   *
   * `replaceDocument` is true for `init`/`read`: the old stack refers to a
   * document that no longer exists, so it must not survive.
   */
  lockAfterIo(replaceDocument: boolean): void {
    if (replaceDocument) {
      this.#undoStack.length = 0;
    }
    this.#redoStack.length = 0;
    this.#lockedByIo = true;
  }

  undo(): string {
    if (this.#lockedByIo) {
      throw EditorError.undoNotAllowedAfterIo();
    }
    const edit = this.#undoStack.pop();
    if (edit === undefined) {
      throw EditorError.nothingToUndo();
    }
    const message = edit.undo();
    this.#redoStack.push(edit);
    return message;
  }

  redo(): string {
    if (this.#lockedByIo) {
      throw EditorError.redoNotAllowedAfterIo();
    }
    const edit = this.#redoStack.pop();
    if (edit === undefined) {
      throw EditorError.nothingToRedo();
    }
    const message = edit.redo();
    this.#undoStack.push(edit);
    return message;
  }
}

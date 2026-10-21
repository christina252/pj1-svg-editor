import type { Edit } from './Edit.ts';

/**
 * An edit built from two closures.
 *
 * Each command captures the little it needs (the element, the values before the
 * change, the parent and index for structural edits) and hands the two
 * directions over here — so `History` stays free of any knowledge about shapes,
 * groups or attributes.
 */
export class CommandEdit implements Edit {
  readonly #undoAction: () => string;
  readonly #redoAction: () => string;

  constructor(undoAction: () => string, redoAction: () => string) {
    this.#undoAction = undoAction;
    this.#redoAction = redoAction;
  }

  undo(): string {
    return this.#undoAction();
  }

  redo(): string {
    return this.#redoAction();
  }
}

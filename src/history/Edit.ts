/**
 * One undoable unit: exactly one editing command (spec §4.3).
 *
 * An edit knows how to revert itself and how to apply itself again, and each
 * direction returns the line to print — the specification prescribes different
 * wording for the two directions (`moved back to (100,100)` vs `moved to
 * (130,100)`).
 */
export interface Edit {
  /** Reverts the change; returns the message for the REPL. */
  undo(): string;

  /** Re-applies the change; returns the message for the REPL. */
  redo(): string;
}

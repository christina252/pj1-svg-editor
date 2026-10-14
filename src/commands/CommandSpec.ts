/** The four groups used by `help` and by the undo rules (spec §3). */
export type CommandGroup = 'document' | 'edit' | 'view' | 'history';

/**
 * One row of the command reference.
 *
 * The catalogue is the single source of truth for the command *surface*
 * (name, syntax, one-line summary); a test asserts that every implemented
 * command's usage message matches its syntax here (see 一致性自查).
 */
export interface CommandSpec {
  readonly name: string;
  readonly syntax: string;
  readonly summary: string;
  readonly group: CommandGroup;
  /** Document commands and display commands are not undoable (spec §4.3). */
  readonly undoable: boolean;
}

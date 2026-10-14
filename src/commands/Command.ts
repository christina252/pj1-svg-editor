import type { CommandContext } from './CommandContext.ts';

/**
 * One CLI command.
 *
 * Every command of the editor is an object of this kind, so that a command can
 * carry its own undo information and the REPL never needs a `switch` over
 * command names (spec §2.1 — Command pattern).
 */
export interface Command {
  /** The name typed at the prompt; must match the CommandCatalog entry. */
  readonly name: string;

  /**
   * Runs the command.
   *
   * @throws CliError for every failure the specification defines; the REPL
   *         prints it and the document must be left untouched.
   */
  execute(args: readonly string[], context: CommandContext): void;
}

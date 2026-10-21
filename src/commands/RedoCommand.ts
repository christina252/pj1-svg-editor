import { EditorError } from '../errors/EditorError.ts';
import type { Command } from './Command.ts';
import type { CommandContext } from './CommandContext.ts';

/**
 * `redo` — re-apply the last undone command (spec §3, R-U2).
 *
 * A new edit clears the redo stack (that happens in `History.push`), so redo is
 * only ever available for the commands that were undone most recently.
 */
export class RedoCommand implements Command {
  readonly name: string = 'redo';
  static readonly USAGE = 'redo';

  execute(args: readonly string[], context: CommandContext): void {
    if (args.length !== 0) {
      throw EditorError.usage(RedoCommand.USAGE);
    }
    context.session.requireDocument();
    context.out.line(context.session.history.redo());
  }
}

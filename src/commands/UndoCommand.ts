import { EditorError } from '../errors/EditorError.ts';
import type { Command } from './Command.ts';
import type { CommandContext } from './CommandContext.ts';

/**
 * `undo` — revert the last editing command (spec §3, R-U1).
 *
 * The message comes from the edit itself, because only the edit knows what
 * "back" means for it (`moved back to (100,100)`, `restored into g#markers`, …).
 */
export class UndoCommand implements Command {
  readonly name: string = 'undo';
  static readonly USAGE = 'undo';

  execute(args: readonly string[], context: CommandContext): void {
    if (args.length !== 0) {
      throw EditorError.usage(UndoCommand.USAGE);
    }
    context.session.requireDocument();
    context.out.line(context.session.history.undo());
  }
}

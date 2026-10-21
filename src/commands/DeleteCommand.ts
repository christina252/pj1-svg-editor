import { EditorError } from '../errors/EditorError.ts';
import type { Command } from './Command.ts';
import type { CommandContext } from './CommandContext.ts';

/**
 * `delete <id>` — remove an element, and with a container its whole subtree
 * (spec §3).
 *
 * One command is one undo unit (S5 restores the subtree into the exact parent and
 * position, which is why removal returns the former index).
 */
export class DeleteCommand implements Command {
  readonly name: string = 'delete';
  static readonly USAGE = 'delete <id>';

  execute(args: readonly string[], context: CommandContext): void {
    if (args.length !== 1) {
      throw EditorError.usage(DeleteCommand.USAGE);
    }
    const element = context.session.requireElement(args[0] ?? '');
    const parent = element.parent;
    if (parent !== null) {
      parent.removeChild(element);
    }
    context.out.line(`${element.label()} deleted`);
  }
}

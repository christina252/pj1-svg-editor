import { EditorError } from '../errors/EditorError.ts';
import type { Command } from './Command.ts';
import type { CommandContext } from './CommandContext.ts';

/**
 * `addto <gid> <id>` — move an existing shape into a container, as the last
 * child (spec §3).
 *
 * Moving a container into its own descendant is refused by the model itself
 * (R-ERR18), so this command does not repeat that check.
 */
export class AddToCommand implements Command {
  readonly name: string = 'addto';
  static readonly USAGE = 'addto <gid> <id>';

  execute(args: readonly string[], context: CommandContext): void {
    if (args.length !== 2) {
      throw EditorError.usage(AddToCommand.USAGE);
    }
    const group = context.session.requireContainer(args[0] ?? '');
    const element = context.session.requireElement(args[1] ?? '');

    group.adopt(element);

    context.out.line(`${element.label()} added to ${group.label()}`);
  }
}

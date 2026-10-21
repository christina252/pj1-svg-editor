import { EditorError } from '../errors/EditorError.ts';
import { CommandEdit } from '../history/CommandEdit.ts';
import type { Command } from './Command.ts';
import type { CommandContext } from './CommandContext.ts';

/**
 * `addto <gid> <id>` — move an existing shape into a container, as the last
 * child (spec §3).
 *
 * Undo moves it back to its former parent and index. Moving a container into
 * its own descendant is refused by the model itself (R-ERR18).
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
    const from = element.parent;
    if (from === null) {
      throw EditorError.noSuchShape(element.id);
    }
    const index = from.indexOf(element);
    const label = element.label();

    group.adopt(element);
    const forward = `${label} added to ${group.label()}`;

    context.out.line(forward);
    context.session.history.push(
      new CommandEdit(
        () => {
          group.removeChild(element);
          from.insertAt(Math.min(index, from.children.length), element);
          return `${label} moved back to ${from.label()}`;
        },
        () => {
          from.removeChild(element);
          group.adopt(element);
          return forward;
        },
      ),
    );
  }
}

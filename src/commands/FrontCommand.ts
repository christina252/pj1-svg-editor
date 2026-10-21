import { EditorError } from '../errors/EditorError.ts';
import { CommandEdit } from '../history/CommandEdit.ts';
import type { Command } from './Command.ts';
import type { CommandContext } from './CommandContext.ts';

/**
 * `front <id>` — move a shape to the front among its siblings (spec §3), i.e.
 * it is painted last.
 *
 * z-order is nothing but the position in the parent's child list, so the command
 * is a re-insert; the model's `insertAt` detaches it first. Undo puts it back at
 * its old index.
 */
export class FrontCommand implements Command {
  readonly name: string = 'front';
  static readonly USAGE = 'front <id>';

  execute(args: readonly string[], context: CommandContext): void {
    if (args.length !== 1) {
      throw EditorError.usage(FrontCommand.USAGE);
    }
    const element = context.session.requireElement(args[0] ?? '');
    const parent = element.parent;
    if (parent === null) {
      throw EditorError.noSuchShape(element.id);
    }
    const index = parent.indexOf(element);
    const forward = `${element.label()} moved to front`;

    parent.append(element);
    context.out.line(forward);
    context.session.history.push(
      new CommandEdit(
        () => {
          parent.insertAt(Math.min(index, parent.children.length), element);
          return `${element.label()} moved back`;
        },
        () => {
          parent.append(element);
          return forward;
        },
      ),
    );
  }
}

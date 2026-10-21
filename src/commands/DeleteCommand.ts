import { EditorError } from '../errors/EditorError.ts';
import { CommandEdit } from '../history/CommandEdit.ts';
import type { Command } from './Command.ts';
import type { CommandContext } from './CommandContext.ts';

/**
 * `delete <id>` — remove an element, and with a container its whole subtree
 * (spec §3).
 *
 * Undo puts the very same object back into its former parent at its former
 * index (`rect#box restored into g#markers`), which is why removal reports the
 * index it had.
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
    if (parent === null) {
      throw EditorError.noSuchShape(element.id);
    }
    const index = parent.indexOf(element);
    const label = element.label();
    const parentLabel = parent.label();

    parent.removeChild(element);
    const forward = `${label} deleted`;

    context.out.line(forward);
    context.session.history.push(
      new CommandEdit(
        () => {
          parent.insertAt(Math.min(index, parent.children.length), element);
          return `${label} restored into ${parentLabel}`;
        },
        () => {
          parent.removeChild(element);
          return forward;
        },
      ),
    );
  }
}

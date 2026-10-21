import { EditorError } from '../errors/EditorError.ts';
import { CommandEdit } from '../history/CommandEdit.ts';
import type { Command } from './Command.ts';
import type { CommandContext } from './CommandContext.ts';

/**
 * `ungroup <gid>` — dissolve a container, promoting its children (spec §3).
 *
 * The children take the container's own position, in order. Two cases are
 * refused: a container directly under the root (R-ERR8) and an opaque container
 * such as `<defs>`, whose internal structure does not belong to this editor
 * (R-ERR6).
 *
 * Undo rebuilds the container object (its members and their order are kept) and
 * puts it back at its old index.
 */
export class UngroupCommand implements Command {
  readonly name: string = 'ungroup';
  static readonly USAGE = 'ungroup <gid>';

  execute(args: readonly string[], context: CommandContext): void {
    if (args.length !== 1) {
      throw EditorError.usage(UngroupCommand.USAGE);
    }
    const group = context.session.requireContainer(args[0] ?? '');
    const document = context.session.requireDocument();

    if (!group.isGeometric) {
      throw EditorError.cannotUngroupComposite(group.id);
    }
    const parent = group.parent;
    if (parent === null || parent === document) {
      throw EditorError.cannotUngroupTopLevel(group.id);
    }

    const children = [...group.children];
    const index = parent.indexOf(group);
    const count = children.length;
    const noun = count === 1 ? 'child' : 'children';
    const forward = `${group.label()} ungrouped (${count} ${noun} promoted)`;

    const promote = (): void => {
      let cursor = Math.min(index, parent.children.length);
      for (const child of children) {
        group.removeChild(child);
        parent.insertAt(cursor, child);
        cursor += 1;
      }
      parent.removeChild(group);
    };

    promote();
    context.out.line(forward);
    context.session.history.push(
      new CommandEdit(
        () => {
          for (const child of children) {
            child.parent?.removeChild(child);
          }
          for (const child of children) {
            group.append(child);
          }
          parent.insertAt(Math.min(index, parent.children.length), group);
          return `${group.label()} regrouped (${count} ${noun})`;
        },
        () => {
          promote();
          return forward;
        },
      ),
    );
  }
}

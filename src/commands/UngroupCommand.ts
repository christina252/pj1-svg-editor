import { EditorError } from '../errors/EditorError.ts';
import type { Command } from './Command.ts';
import type { CommandContext } from './CommandContext.ts';

/**
 * `ungroup <gid>` — dissolve a container, promoting its children (spec §3).
 *
 * The children take the container's own position, in order. Two cases are
 * refused: a container directly under the root (R-ERR8) and an opaque container
 * such as `<defs>`, whose internal structure does not belong to this editor
 * (R-ERR6).
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
    let index = parent.indexOf(group);
    for (const child of children) {
      group.removeChild(child);
      parent.insertAt(index, child);
      index += 1;
    }
    parent.removeChild(group);

    const count = children.length;
    context.out.line(`${group.label()} ungrouped (${count} ${count === 1 ? 'child' : 'children'} promoted)`);
  }
}

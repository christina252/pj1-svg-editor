import { EditorError } from '../errors/EditorError.ts';
import type { Element } from '../model/Element.ts';
import { Group } from '../model/Group.ts';
import type { Command } from './Command.ts';
import type { CommandContext } from './CommandContext.ts';

/**
 * `group <newGid> <id1> <id2>…` — collect existing shapes into a new container
 * (spec §3).
 *
 * The members are detached from their own parents and re-inserted **in the order
 * they were typed**, and the new group takes the place of the first member, so
 * grouping does not change the painting order of everything else.
 *
 * A container that is an ancestor of another member is refused (R-ERR7):
 * grouping `markers` together with `c1` (a child of `markers`) has no meaningful
 * tree shape.
 */
export class GroupCommand implements Command {
  readonly name: string = 'group';
  static readonly USAGE = 'group <newGid> <id1> <id2> ...';

  execute(args: readonly string[], context: CommandContext): void {
    if (args.length < 3) {
      throw EditorError.usage(GroupCommand.USAGE);
    }
    const newId = args[0] ?? '';
    const document = context.session.requireDocument();

    if (document.hasId(newId)) {
      throw EditorError.idAlreadyExists(newId);
    }

    const members: Element[] = args.slice(1).map((id) => context.session.requireElement(id));
    for (const member of members) {
      if (members.some((other) => other !== member && member.contains(other))) {
        throw EditorError.cannotGroupIntoDescendant(member.id);
      }
    }

    const first = members[0];
    if (first === undefined) {
      throw EditorError.usage(GroupCommand.USAGE);
    }
    const parent = first.parent ?? document;
    const index = Math.min(parent.indexOf(first), parent.children.length);

    for (const member of members) {
      member.parent?.removeChild(member);
    }

    const group = new Group(newId);
    for (const member of members) {
      group.append(member);
    }
    parent.insertAt(Math.min(index, parent.children.length), group);

    const count = members.length;
    context.out.line(`${group.label()} created with ${count} ${count === 1 ? 'child' : 'children'}`);
  }
}

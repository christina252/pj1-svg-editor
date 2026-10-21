import { EditorError } from '../errors/EditorError.ts';
import { CommandEdit } from '../history/CommandEdit.ts';
import type { Container } from '../model/Container.ts';
import type { Element } from '../model/Element.ts';
import { Group } from '../model/Group.ts';
import type { Command } from './Command.ts';
import type { CommandContext } from './CommandContext.ts';

/** Where one member was before the group was built. */
interface Placement {
  readonly element: Element;
  readonly parent: Container;
  readonly index: number;
}

/**
 * `group <newGid> <id1> <id2>…` — collect existing shapes into a new container
 * (spec §3).
 *
 * The members are detached from their own parents and re-inserted **in the order
 * they were typed**, and the new group takes the place of the first member, so
 * grouping does not change the painting order of everything else.
 *
 * A container that is an ancestor of another member is refused (R-ERR7).
 * Undo dissolves the group and puts every member back where it came from — the
 * whole command is one undo unit even when the members lived in three different
 * parents.
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

    const placements: Placement[] = members.map((member) => {
      const owner = member.parent ?? document;
      return { element: member, parent: owner, index: owner.indexOf(member) };
    });

    for (const member of members) {
      member.parent?.removeChild(member);
    }
    const group = new Group(newId);
    for (const member of members) {
      group.append(member);
    }
    parent.insertAt(Math.min(index, parent.children.length), group);

    const count = members.length;
    const noun = count === 1 ? 'child' : 'children';
    const forward = `${group.label()} created with ${count} ${noun}`;

    context.out.line(forward);
    context.session.history.push(
      new CommandEdit(
        () => {
          parent.removeChild(group);
          GroupCommand.#restore(placements);
          return `${group.label()} dissolved (${count} ${noun} restored)`;
        },
        () => {
          for (const placement of placements) {
            placement.element.parent?.removeChild(placement.element);
          }
          for (const placement of placements) {
            group.append(placement.element);
          }
          parent.insertAt(Math.min(index, parent.children.length), group);
          return forward;
        },
      ),
    );
  }

  /** Puts every member back into its own parent, ascending index per parent. */
  static #restore(placements: readonly Placement[]): void {
    const byParent = new Map<Container, Placement[]>();
    for (const placement of placements) {
      const list = byParent.get(placement.parent) ?? [];
      list.push(placement);
      byParent.set(placement.parent, list);
    }
    for (const [owner, list] of byParent) {
      list.sort((a, b) => a.index - b.index);
      for (const placement of list) {
        owner.insertAt(Math.min(placement.index, owner.children.length), placement.element);
      }
    }
  }
}

import { EditorError } from '../errors/EditorError.ts';
import { CommandEdit } from '../history/CommandEdit.ts';
import type { Element } from '../model/Element.ts';
import { NumberFormat } from '../model/NumberFormat.ts';
import type { Command } from './Command.ts';
import type { CommandContext } from './CommandContext.ts';

/**
 * `move <id> <dx> <dy>` — translate by an offset (spec §3).
 *
 * A leaf reports its new anchor (`circle#c1 moved to (130,100)`), a container
 * reports the offset it applied to its whole subtree (`g#node2 moved by
 * (0,100)`) — exactly what the session transcripts of spec §6 / §6.1 show; undo
 * mirrors both forms (`moved back to …` / `moved back by …`).
 */
export class MoveCommand implements Command {
  readonly name: string = 'move';
  static readonly USAGE = 'move <id> <dx> <dy>';

  execute(args: readonly string[], context: CommandContext): void {
    if (args.length !== 3) {
      throw EditorError.usage(MoveCommand.USAGE);
    }
    const dx = NumberFormat.parse(args[1] ?? '');
    const dy = NumberFormat.parse(args[2] ?? '');
    const element = context.session.requireElement(args[0] ?? '');

    if (!element.isGeometric) {
      throw EditorError.unsupportedElement(element.id);
    }

    const before = element.captureAttributes();
    element.translate(dx, dy);
    const forward = MoveCommand.#message(element, dx, dy, false);

    context.out.line(forward);
    context.session.history.push(
      new CommandEdit(
        () => {
          element.restoreAttributes(before);
          return MoveCommand.#message(element, dx, dy, true);
        },
        () => {
          element.translate(dx, dy);
          return forward;
        },
      ),
    );
  }

  /** `… moved to (x,y)` for a leaf, `… moved by (dx,dy)` for a container. */
  static #message(element: Element, dx: number, dy: number, back: boolean): string {
    const anchor = element.anchor();
    const prefix = `${element.label()} moved ${back ? 'back ' : ''}`;
    if (anchor === null) {
      const sign = back ? -1 : 1;
      return `${prefix}by (${NumberFormat.format(sign * dx)},${NumberFormat.format(sign * dy)})`;
    }
    return `${prefix}to (${NumberFormat.format(anchor.x)},${NumberFormat.format(anchor.y)})`;
  }
}

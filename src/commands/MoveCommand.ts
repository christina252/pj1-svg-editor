import { EditorError } from '../errors/EditorError.ts';
import { NumberFormat } from '../model/NumberFormat.ts';
import type { Command } from './Command.ts';
import type { CommandContext } from './CommandContext.ts';

/**
 * `move <id> <dx> <dy>` — translate by an offset (spec §3).
 *
 * A leaf reports its new anchor (`circle#c1 moved to (130,100)`), a container
 * reports the offset it applied to its whole subtree (`g#node2 moved by
 * (0,100)`) — exactly what the session transcripts of spec §6 / §6.1 show.
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
    element.translate(dx, dy);

    const anchor = element.anchor();
    context.out.line(
      anchor === null
        ? `${element.label()} moved by (${NumberFormat.format(dx)},${NumberFormat.format(dy)})`
        : `${element.label()} moved to (${NumberFormat.format(anchor.x)},${NumberFormat.format(anchor.y)})`,
    );
  }
}

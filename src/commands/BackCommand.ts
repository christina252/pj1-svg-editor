import { EditorError } from '../errors/EditorError.ts';
import type { Command } from './Command.ts';
import type { CommandContext } from './CommandContext.ts';

/**
 * `back <id>` — move a shape to the back among its siblings (spec §3), i.e. it
 * is painted first.
 */
export class BackCommand implements Command {
  readonly name: string = 'back';
  static readonly USAGE = 'back <id>';

  execute(args: readonly string[], context: CommandContext): void {
    if (args.length !== 1) {
      throw EditorError.usage(BackCommand.USAGE);
    }
    const element = context.session.requireElement(args[0] ?? '');
    const parent = element.parent;
    if (parent !== null) {
      parent.insertAt(0, element);
    }
    context.out.line(`${element.label()} moved to back`);
  }
}

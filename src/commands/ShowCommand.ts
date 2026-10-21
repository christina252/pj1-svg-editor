import { EditorError } from '../errors/EditorError.ts';
import type { Command } from './Command.ts';
import type { CommandContext } from './CommandContext.ts';
import { ShowFormatter } from './ShowFormatter.ts';

/**
 * `show <id>` — the attributes of a single element (spec §5.2).
 *
 * Display command: not undoable (R-U4).
 */
export class ShowCommand implements Command {
  readonly name: string = 'show';
  static readonly USAGE = 'show <id>';

  readonly #formatter = new ShowFormatter();

  execute(args: readonly string[], context: CommandContext): void {
    if (args.length !== 1) {
      throw EditorError.usage(ShowCommand.USAGE);
    }

    const element = context.session.requireElement(args[0] ?? '');
    for (const line of this.#formatter.format(element)) {
      context.out.line(line);
    }
  }
}

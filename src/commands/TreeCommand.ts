import { EditorError } from '../errors/EditorError.ts';
import type { Command } from './Command.ts';
import type { CommandContext } from './CommandContext.ts';
import { TreeFormatter } from './TreeFormatter.ts';

/**
 * `tree [id]` — the document tree with inline attributes (spec §5.1).
 *
 * Display command: it never enters the undo stack (R-U4) and a missing id is
 * the usual `no such shape` error.
 */
export class TreeCommand implements Command {
  readonly name: string = 'tree';
  static readonly USAGE = 'tree [id]';

  readonly #formatter = new TreeFormatter();

  execute(args: readonly string[], context: CommandContext): void {
    if (args.length > 1) {
      throw EditorError.usage(TreeCommand.USAGE);
    }

    const id = args[0];
    const root = id === undefined ? context.session.requireDocument() : context.session.requireElement(id);
    for (const line of this.#formatter.format(root)) {
      context.out.line(line);
    }
  }
}

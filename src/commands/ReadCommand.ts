import { EditorError } from '../errors/EditorError.ts';
import type { Command } from './Command.ts';
import type { CommandContext } from './CommandContext.ts';

/**
 * `read <file.svg>` — load a file as the current document (spec §3).
 *
 * Document command: not undoable, and it locks undo/redo until the next edit
 * (R-U3). Warnings collected while loading (ids that had to be invented, D21)
 * are printed before the summary, as the session transcript of spec §6 shows.
 */
export class ReadCommand implements Command {
  readonly name: string = 'read';
  static readonly USAGE = 'read <file.svg>';

  execute(args: readonly string[], context: CommandContext): void {
    if (args.length !== 1) {
      throw EditorError.usage(ReadCommand.USAGE);
    }

    const path = args[0] ?? '';
    const loaded = context.store.load(path);
    loaded.document.setSourcePath(path);
    context.session.setDocument(loaded.document);

    for (const warning of loaded.warnings) {
      context.out.line(warning);
    }
    context.out.line(`read ${path} (${loaded.document.elementCount()} elements)`);
  }
}

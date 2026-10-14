import { EditorError } from '../errors/EditorError.ts';
import { Document } from '../model/Document.ts';
import { NumberFormat } from '../model/NumberFormat.ts';
import type { Command } from './Command.ts';
import type { CommandContext } from './CommandContext.ts';

/**
 * `init [w] [h]` — start a new, empty canvas (default 800×600, spec §3).
 *
 * Document command: it is not undoable, and it replaces the current document
 * (R-U3).
 */
export class InitCommand implements Command {
  readonly name: string = 'init';
  static readonly USAGE = 'init [w] [h]';

  execute(args: readonly string[], context: CommandContext): void {
    if (args.length > 2) {
      throw EditorError.usage(InitCommand.USAGE);
    }

    const width = args[0] === undefined ? Document.DEFAULT_WIDTH : NumberFormat.parse(args[0]);
    const height = args[1] === undefined ? Document.DEFAULT_HEIGHT : NumberFormat.parse(args[1]);
    if (width <= 0 || height <= 0) {
      throw EditorError.canvasSizeMustBePositive();
    }

    const document = Document.blank(width, height);
    context.session.setDocument(document);
    context.out.line(`canvas ${document.size} created`);
  }
}

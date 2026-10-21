import { EditorError } from '../errors/EditorError.ts';
import { NumberFormat } from '../model/NumberFormat.ts';
import type { Command } from './Command.ts';
import type { CommandContext } from './CommandContext.ts';

/**
 * `canvas [w] [h]` — show or change the canvas size (spec §3).
 *
 * Without arguments it only reports the size: a display command, which must not
 * touch the undo history. With arguments it resizes the document, which is a
 * document command and therefore locks undo/redo until the next edit (R-U3).
 */
export class CanvasCommand implements Command {
  readonly name: string = 'canvas';
  static readonly USAGE = 'canvas [w] [h]';

  execute(args: readonly string[], context: CommandContext): void {
    if (args.length > 2) {
      throw EditorError.usage(CanvasCommand.USAGE);
    }

    const document = context.session.requireDocument();

    if (args.length === 0) {
      context.out.line(`canvas ${document.size}`);
      return;
    }

    const width = NumberFormat.parse(args[0] ?? '');
    const height = args[1] === undefined ? document.height : NumberFormat.parse(args[1]);
    if (width <= 0 || height <= 0) {
      throw EditorError.canvasSizeMustBePositive();
    }

    document.resize(width, height);
    // resizing is a document command: it locks undo until the next edit (R-U3)
    context.session.history.lockAfterIo(false);
    context.out.line(`canvas resized to ${document.size}`);
  }
}

import { EditorError } from '../errors/EditorError.ts';
import { CommandEdit } from '../history/CommandEdit.ts';
import { NumberFormat } from '../model/NumberFormat.ts';
import type { Command } from './Command.ts';
import type { CommandContext } from './CommandContext.ts';

/**
 * `scale <id> <factor>` — multiply every geometric attribute (spec §3 / R-E4).
 *
 * Undo restores the saved attribute strings instead of scaling by `1/factor`:
 * with six-decimal rounding the round trip is not guaranteed to be exact.
 */
export class ScaleCommand implements Command {
  readonly name: string = 'scale';
  static readonly USAGE = 'scale <id> <factor>';

  execute(args: readonly string[], context: CommandContext): void {
    if (args.length !== 2) {
      throw EditorError.usage(ScaleCommand.USAGE);
    }
    const factor = NumberFormat.parse(args[1] ?? '');
    if (factor <= 0) {
      throw EditorError.scaleFactorMustBePositive();
    }
    const element = context.session.requireElement(args[0] ?? '');

    if (!element.isGeometric) {
      throw EditorError.unsupportedElement(element.id);
    }

    const before = element.captureAttributes();
    element.scaleBy(factor);
    const shown = NumberFormat.format(factor);
    const forward = `${element.label()} scaled by ${shown}`;

    context.out.line(forward);
    context.session.history.push(
      new CommandEdit(
        () => {
          element.restoreAttributes(before);
          return `${element.label()} scaled back by ${shown}`;
        },
        () => {
          element.scaleBy(factor);
          return forward;
        },
      ),
    );
  }
}

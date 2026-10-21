import { EditorError } from '../errors/EditorError.ts';
import { NumberFormat } from '../model/NumberFormat.ts';
import type { Command } from './Command.ts';
import type { CommandContext } from './CommandContext.ts';

/**
 * `scale <id> <factor>` — multiply every geometric attribute (spec §3 / R-E4).
 *
 * The factor must be positive (R-ERR9): a zero or negative factor would collapse
 * or mirror the shape, which the specification does not define. On a container
 * the call recurses into every descendant (Composite), which is why one command
 * is enough.
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
    element.scaleBy(factor);

    context.out.line(`${element.label()} scaled by ${NumberFormat.format(factor)}`);
  }
}

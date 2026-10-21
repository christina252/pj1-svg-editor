import { EditorError } from '../errors/EditorError.ts';
import { CommandEdit } from '../history/CommandEdit.ts';
import type { Command } from './Command.ts';
import type { CommandContext } from './CommandContext.ts';

/**
 * `set <id> <attr> <value>` — write one whitelisted attribute (spec §3 / R-E5).
 *
 * The whitelist lives in the model (`Shape.setAttribute`), so it cannot drift
 * from what the classes actually support; this command only reports the effect.
 * The text content is echoed with quotes because it is the one attribute whose
 * value may contain blanks.
 */
export class SetCommand implements Command {
  readonly name: string = 'set';
  static readonly USAGE = 'set <id> <attr> <value>';

  execute(args: readonly string[], context: CommandContext): void {
    if (args.length !== 3) {
      throw EditorError.usage(SetCommand.USAGE);
    }
    const element = context.session.requireElement(args[0] ?? '');
    const attribute = args[1] ?? '';
    const value = args[2] ?? '';

    const previous = element.getAttribute(attribute);
    element.setAttribute(attribute, value);
    const forward = SetCommand.#message(element.label(), attribute, value);

    context.out.line(forward);
    context.session.history.push(
      new CommandEdit(
        () => {
          if (previous === undefined) {
            element.removeAttribute(attribute);
          } else {
            element.setAttribute(attribute, previous);
          }
          return SetCommand.#message(element.label(), attribute, previous ?? '');
        },
        () => {
          element.setAttribute(attribute, value);
          return forward;
        },
      ),
    );
  }

  static #message(label: string, attribute: string, value: string): string {
    const shown = attribute === 'text' ? `text="${value}"` : `${attribute}=${value}`;
    return `${label} updated: ${shown}`;
  }
}

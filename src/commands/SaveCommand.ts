import { EditorError } from '../errors/EditorError.ts';
import type { Command } from './Command.ts';
import type { CommandContext } from './CommandContext.ts';

/**
 * `save [file.svg]` — write the current document (spec §3).
 *
 * Without an argument it saves back to the path the document was read from
 * (or the path of a previous `save`); a document created by `init` has no path
 * yet, which is the one case the specification leaves open — see D5 / R-ERR12.
 */
export class SaveCommand implements Command {
  readonly name: string = 'save';
  static readonly USAGE = 'save [file.svg]';

  execute(args: readonly string[], context: CommandContext): void {
    if (args.length > 1) {
      throw EditorError.usage(SaveCommand.USAGE);
    }

    const document = context.session.requireDocument();
    const path = args[0] ?? document.sourcePath;
    if (path === null) {
      throw EditorError.noFilePath();
    }

    context.store.save(document, path);
    document.setSourcePath(path);
    // saving locks undo/redo until the next edit command (R-U3), but the
    // history itself survives: the document is still the same one
    context.session.history.lockAfterIo(false);
    context.out.line(`saved to ${path} (${document.elementCount()} elements)`);
  }
}

import type { Command } from './Command.ts';
import type { CommandContext } from './CommandContext.ts';
import type { CommandGroup } from './CommandSpec.ts';

/**
 * `help` — prints every command with its syntax, grouped the way spec §3
 * groups them.
 */
export class HelpCommand implements Command {
  readonly name: string = 'help';

  static readonly #GROUP_TITLES: Record<CommandGroup, string> = {
    document: 'document (not undoable)',
    edit: 'edit (undoable)',
    view: 'view (display only)',
    history: 'history',
  };

  execute(_args: readonly string[], context: CommandContext): void {
    const { out, catalog } = context;
    out.line('commands');
    out.line('');

    for (const entry of catalog.grouped()) {
      const width = Math.max(...entry.specs.map((spec) => spec.syntax.length));
      out.line(HelpCommand.#GROUP_TITLES[entry.group]);
      for (const spec of entry.specs) {
        out.line(`  ${spec.syntax.padEnd(width)}  ${spec.summary}`);
      }
      out.line('');
    }

    out.line("lines starting with '#' are comments; 'in <containerId>' attaches a new shape to a container");
  }
}

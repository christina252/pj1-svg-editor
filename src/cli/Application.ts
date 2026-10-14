import { CanvasCommand } from '../commands/CanvasCommand.ts';
import type { Command } from '../commands/Command.ts';
import { CommandCatalog } from '../commands/CommandCatalog.ts';
import { EditorSession } from '../commands/EditorSession.ts';
import { HelpCommand } from '../commands/HelpCommand.ts';
import { InitCommand } from '../commands/InitCommand.ts';
import { CommandRegistry } from '../registry/CommandRegistry.ts';
import { BANNER } from './banner.ts';
import type { LineSource } from './LineSource.ts';
import type { OutputSink } from '../ports/OutputSink.ts';
import { Repl } from './Repl.ts';

/**
 * Composition root: knows every command and builds a REPL for a given input
 * and output.
 *
 * The CLI entry point and the command tests both go through this class, so a
 * test session is assembled exactly like a real one — only the streams differ.
 */
export class Application {
  readonly #registry = new CommandRegistry();
  readonly #catalog: CommandCatalog;
  readonly #session = new EditorSession();

  constructor() {
    this.#catalog = CommandCatalog.default();
    for (const command of Application.#commands()) {
      this.#registry.register(command);
    }
  }

  get registry(): CommandRegistry {
    return this.#registry;
  }

  get session(): EditorSession {
    return this.#session;
  }

  buildRepl(source: LineSource, sink: OutputSink, showPrompt: boolean): Repl {
    return new Repl({
      source,
      sink,
      registry: this.#registry,
      catalog: this.#catalog,
      session: this.#session,
      banner: BANNER,
      prompt: 'svg> ',
      showPrompt,
    });
  }

  /** Every command of the editor; the list grows stage by stage (see docs/plan.md). */
  static #commands(): Command[] {
    return [new HelpCommand(), new InitCommand(), new CanvasCommand()];
  }
}

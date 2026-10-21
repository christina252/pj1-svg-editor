import { AddToCommand } from '../commands/AddToCommand.ts';
import { BackCommand } from '../commands/BackCommand.ts';
import { CanvasCommand } from '../commands/CanvasCommand.ts';
import type { Command } from '../commands/Command.ts';
import { CommandCatalog } from '../commands/CommandCatalog.ts';
import type { CommandContext } from '../commands/CommandContext.ts';
import { CreateCommand } from '../commands/CreateCommand.ts';
import { DeleteCommand } from '../commands/DeleteCommand.ts';
import { EditorSession } from '../commands/EditorSession.ts';
import { FrontCommand } from '../commands/FrontCommand.ts';
import { GroupCommand } from '../commands/GroupCommand.ts';
import { HelpCommand } from '../commands/HelpCommand.ts';
import { InitCommand } from '../commands/InitCommand.ts';
import { MoveCommand } from '../commands/MoveCommand.ts';
import { ReadCommand } from '../commands/ReadCommand.ts';
import { SaveCommand } from '../commands/SaveCommand.ts';
import { ScaleCommand } from '../commands/ScaleCommand.ts';
import { SetCommand } from '../commands/SetCommand.ts';
import { ShowCommand } from '../commands/ShowCommand.ts';
import { TreeCommand } from '../commands/TreeCommand.ts';
import { UngroupCommand } from '../commands/UngroupCommand.ts';
import { SvgDocumentStore } from '../io/SvgDocumentStore.ts';
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
  readonly #services: Omit<CommandContext, 'out'>;

  constructor() {
    const session = new EditorSession();
    this.#services = {
      catalog: CommandCatalog.default(),
      session,
      store: new SvgDocumentStore(),
    };
    for (const command of Application.#commands()) {
      this.#registry.register(command);
    }
  }

  get registry(): CommandRegistry {
    return this.#registry;
  }

  get services(): Omit<CommandContext, 'out'> {
    return this.#services;
  }

  buildRepl(source: LineSource, sink: OutputSink, showPrompt: boolean): Repl {
    return new Repl({
      source,
      sink,
      registry: this.#registry,
      services: this.#services,
      banner: BANNER,
      prompt: 'svg> ',
      showPrompt,
    });
  }

  /** Every command of the editor; the list grows stage by stage (see docs/plan.md). */
  static #commands(): Command[] {
    return [
      new HelpCommand(),
      new InitCommand(),
      new CanvasCommand(),
      new ReadCommand(),
      new SaveCommand(),
      new CreateCommand(),
      new MoveCommand(),
      new ScaleCommand(),
      new SetCommand(),
      new DeleteCommand(),
      new GroupCommand(),
      new UngroupCommand(),
      new AddToCommand(),
      new FrontCommand(),
      new BackCommand(),
      new TreeCommand(),
      new ShowCommand(),
    ];
  }
}

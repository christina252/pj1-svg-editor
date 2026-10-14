import { CliError } from './CliError.ts';
import type { LineSource } from './LineSource.ts';
import { Tokenizer } from './Tokenizer.ts';
import type { OutputSink } from '../ports/OutputSink.ts';
import type { CommandContext } from '../commands/CommandContext.ts';
import type { CommandCatalog } from '../commands/CommandCatalog.ts';
import type { CommandRegistry } from '../registry/CommandRegistry.ts';

/** Everything the REPL needs; all of it is injected, nothing is global. */
export interface ReplOptions {
  readonly source: LineSource;
  readonly sink: OutputSink;
  readonly registry: CommandRegistry;
  readonly catalog: CommandCatalog;
  readonly banner: string;
  /** Printed before each input line, e.g. `svg> ` (spec §2). */
  readonly prompt: string;
  /** Off for scripted replay so that output stays clean and diffable. */
  readonly showPrompt: boolean;
}

/**
 * The read-eval-print loop.
 *
 * One line in → one command executed → its output written to the sink.
 * A failing command never aborts the session and never changes state (R-C7).
 */
export class Repl {
  readonly #options: ReplOptions;

  constructor(options: ReplOptions) {
    this.#options = options;
  }

  async run(): Promise<void> {
    const { source, sink, banner, prompt, showPrompt } = this.#options;
    sink.line(banner);

    for (;;) {
      if (showPrompt) {
        sink.write(prompt);
      }
      const line = await source.readLine();
      if (line === null) {
        return;
      }
      this.#runLine(line);
    }
  }

  #runLine(line: string): void {
    let tokens: string[];
    try {
      tokens = Tokenizer.tokenize(line);
    } catch (error) {
      this.#report(error);
      return;
    }

    const name = tokens[0];
    if (name === undefined) {
      return; // blank line or comment
    }

    const command = this.#options.registry.lookup(name);
    if (command === undefined) {
      this.#options.sink.line(`error: unknown command: ${name}. type 'help' for commands`);
      return;
    }

    const context: CommandContext = {
      out: this.#options.sink,
      catalog: this.#options.catalog,
    };

    try {
      command.execute(tokens.slice(1), context);
    } catch (error) {
      this.#report(error);
    }
  }

  #report(error: unknown): void {
    const { sink } = this.#options;
    if (error instanceof CliError) {
      sink.line(`error: ${error.message}`);
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    sink.line(`error: internal error: ${message}`);
  }
}

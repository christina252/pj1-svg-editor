/**
 * CLI entry point — the composition root.
 *
 * It wires the real terminal adapters (stdin/stdout) to the REPL. Everything
 * else (tokenizer, registry, sinks) is injected, which is what makes the same
 * code path testable without spawning a process.
 */
import { BANNER } from './banner.ts';
import { Repl } from './Repl.ts';
import { StdinLineSource } from './StdinLineSource.ts';
import { StdoutSink } from './StdoutSink.ts';
import { HelpCommand } from '../commands/HelpCommand.ts';
import { CommandCatalog } from '../commands/CommandCatalog.ts';
import { EditorSession } from '../commands/EditorSession.ts';
import { CommandRegistry } from '../registry/CommandRegistry.ts';

const catalog = CommandCatalog.default();

const registry = new CommandRegistry();
registry.register(new HelpCommand());

const repl = new Repl({
  source: new StdinLineSource(),
  sink: new StdoutSink(),
  registry,
  catalog,
  session: new EditorSession(),
  banner: BANNER,
  prompt: 'svg> ',
  showPrompt: process.stdin.isTTY === true,
});

await repl.run();

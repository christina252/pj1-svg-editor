import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BANNER } from '../../src/cli/banner.ts';
import { CliError } from '../../src/cli/CliError.ts';
import { Repl } from '../../src/cli/Repl.ts';
import { ScriptLineSource } from '../../src/cli/ScriptLineSource.ts';
import { CommandCatalog } from '../../src/commands/CommandCatalog.ts';
import { HelpCommand } from '../../src/commands/HelpCommand.ts';
import type { Command } from '../../src/commands/Command.ts';
import { CommandRegistry } from '../../src/registry/CommandRegistry.ts';
import { BufferSink } from '../support/BufferSink.ts';

const catalog = CommandCatalog.default();

/**
 * A prompt that cannot collide with any command syntax in the output
 * (`read <file.svg>` + padding would otherwise contain `svg> ` by accident).
 */
const TEST_PROMPT = 'test> ';

interface SessionOptions {
  readonly showPrompt?: boolean;
  readonly extraCommands?: readonly Command[];
}

function buildSession(
  lines: readonly string[],
  options: SessionOptions = {},
): { repl: Repl; sink: BufferSink } {
  const sink = new BufferSink();
  const registry = new CommandRegistry();
  registry.register(new HelpCommand());
  for (const command of options.extraCommands ?? []) {
    registry.register(command);
  }
  const repl = new Repl({
    source: new ScriptLineSource(lines),
    sink,
    registry,
    catalog,
    banner: BANNER,
    prompt: TEST_PROMPT,
    showPrompt: options.showPrompt ?? false,
  });
  return { repl, sink };
}

async function runSession(lines: readonly string[], options: SessionOptions = {}): Promise<BufferSink> {
  const { repl, sink } = buildSession(lines, options);
  await repl.run();
  return sink;
}

describe('Repl', () => {
  it('prints the banner first and exits at end of input', async () => {
    const sink = await runSession([]);
    assert.deepEqual(sink.lines(), [BANNER]);
  });

  it('prints the prompt only in interactive mode', async () => {
    const quiet = await runSession(['help'], { showPrompt: false });
    assert.ok(!quiet.text().includes(TEST_PROMPT));

    const interactive = await runSession([], { showPrompt: true });
    assert.ok(interactive.text().includes(TEST_PROMPT));
  });

  it('ignores comment and blank lines', async () => {
    const sink = await runSession(['', '   ', '# just a comment']);
    assert.deepEqual(sink.lines(), [BANNER]);
  });

  it('reports an unknown command without aborting the session', async () => {
    const sink = await runSession(['frobnicate', 'help']);
    assert.equal(sink.lines()[1], "error: unknown command: frobnicate. type 'help' for commands");
    assert.ok(sink.text().includes('commands'));
  });

  it('reports an unterminated quote', async () => {
    const sink = await runSession(['create text t1 20 40 "broken']);
    assert.equal(sink.lines()[1], 'error: unterminated quote in command line');
  });

  it('turns a CliError thrown by a command into one error: line', async () => {
    const failing: Command = {
      name: 'boom',
      execute() {
        throw new CliError('no such shape: r9');
      },
    };
    const sink = await runSession(['boom', 'help'], { extraCommands: [failing] });
    assert.equal(sink.lines()[1], 'error: no such shape: r9');
    assert.ok(sink.text().includes('commands'), 'the session must survive the failure');
  });

  it('reports unexpected failures as internal errors instead of crashing', async () => {
    const broken: Command = {
      name: 'broken',
      execute() {
        throw new Error('boom');
      },
    };
    const sink = await runSession(['broken', 'help'], { extraCommands: [broken] });
    assert.equal(sink.lines()[1], 'error: internal error: boom');
    assert.ok(sink.text().includes('commands'));
  });
});

describe('help output', () => {
  it('lists every command of the catalogue (19, spec §3)', async () => {
    assert.equal(catalog.all().length, 19);
    const sink = await runSession(['help']);
    const text = sink.text();
    for (const spec of catalog.all()) {
      assert.ok(text.includes(spec.name), `help should mention ${spec.name}`);
      assert.ok(text.includes(spec.syntax), `help should show the syntax of ${spec.name}`);
    }
  });
});

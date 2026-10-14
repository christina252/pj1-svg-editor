import { Application } from '../../src/cli/Application.ts';
import { ScriptLineSource } from '../../src/cli/ScriptLineSource.ts';
import { BufferSink } from './BufferSink.ts';

/**
 * Runs a command script through the real application wiring and returns the
 * captured output — the in-process equivalent of
 * `npm run cli < script` (see doc/ai-log.md: the sandbox forbids piped stdio).
 */
export async function runSession(lines: readonly string[]): Promise<BufferSink> {
  const sink = new BufferSink();
  const repl = new Application().buildRepl(new ScriptLineSource(lines), sink, false);
  await repl.run();
  return sink;
}

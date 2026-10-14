/**
 * CLI entry point.
 *
 * All wiring lives in Application, so this file only decides where input comes
 * from and where output goes — and whether the prompt should be printed
 * (interactive terminal) or suppressed (script replay).
 */
import { Application } from './Application.ts';
import { StdinLineSource } from './StdinLineSource.ts';
import { StdoutSink } from './StdoutSink.ts';

const application = new Application();
const repl = application.buildRepl(
  new StdinLineSource(),
  new StdoutSink(),
  process.stdin.isTTY === true,
);

await repl.run();

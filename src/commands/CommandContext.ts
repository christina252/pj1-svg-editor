import type { OutputSink } from '../ports/OutputSink.ts';
import type { CommandCatalog } from './CommandCatalog.ts';

/**
 * Everything a command may use while it runs.
 *
 * Stages S3–S5 extend this with the current document and the undo history;
 * existing commands stay untouched because they only read what they need.
 */
export interface CommandContext {
  /** Where success summaries and display output go (never `process.stdout`). */
  readonly out: OutputSink;
  /** The command reference, used by `help` and by usage messages. */
  readonly catalog: CommandCatalog;
}

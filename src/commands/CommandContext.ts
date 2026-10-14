import type { OutputSink } from '../ports/OutputSink.ts';
import type { DocumentStore } from '../ports/DocumentStore.ts';
import type { CommandCatalog } from './CommandCatalog.ts';
import type { EditorSession } from './EditorSession.ts';

/**
 * Everything a command may use while it runs.
 *
 * Stage S5 extends the session with the undo history; existing commands stay
 * untouched because they only read what they need.
 */
export interface CommandContext {
  /** Where success summaries and display output go (never `process.stdout`). */
  readonly out: OutputSink;
  /** The command reference, used by `help` and by usage messages. */
  readonly catalog: CommandCatalog;
  /** The current document and, later, its edit history. */
  readonly session: EditorSession;
  /** Loading and saving documents; the SVG/disk details live behind this port. */
  readonly store: DocumentStore;
}

import type { Document } from '../model/Document.ts';

/** The result of loading a file: the document plus user-facing notices. */
export interface LoadedDocument {
  readonly document: Document;
  /** e.g. `warning: assigned id rect1 to unnamed <rect>` (R-C4). */
  readonly warnings: readonly string[];
}

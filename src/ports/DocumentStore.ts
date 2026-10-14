import type { Document } from '../model/Document.ts';
import type { LoadedDocument } from './LoadedDocument.ts';

/**
 * Port for "give me a document / store this document".
 *
 * Commands depend on this interface, not on the SVG implementation, so the
 * command layer needs no knowledge of XML, of `fast-xml-parser` or of the file
 * system (see doc/README.md — 依赖方向规则). `src/io/SvgDocumentStore.ts` is
 * the adapter; tests can substitute an in-memory one.
 */
export interface DocumentStore {
  /** Loads an SVG file; warnings are printed by the `read` command. */
  load(path: string): LoadedDocument;

  /** Serialises and writes the document to `path`. */
  save(document: Document, path: string): void;
}

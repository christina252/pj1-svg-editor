import type { Document } from '../../src/model/Document.ts';
import type { DocumentStore } from '../../src/ports/DocumentStore.ts';
import type { LoadedDocument } from '../../src/ports/LoadedDocument.ts';

/**
 * Test double for the document store: proves that the command layer really
 * depends on the port and not on SVG or the file system.
 */
export class StubDocumentStore implements DocumentStore {
  loadCalls: string[] = [];
  saveCalls: string[] = [];

  load(path: string): LoadedDocument {
    this.loadCalls.push(path);
    throw new Error(`stub store cannot load ${path}`);
  }

  save(document: Document, path: string): void {
    this.saveCalls.push(path);
    void document;
  }
}

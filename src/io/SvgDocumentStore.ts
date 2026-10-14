import type { Document } from '../model/Document.ts';
import type { DocumentStore } from '../ports/DocumentStore.ts';
import type { LoadedDocument } from '../ports/LoadedDocument.ts';
import { FileStore } from './FileStore.ts';
import { SvgReader } from './SvgReader.ts';
import { SvgWriter } from './SvgWriter.ts';

/**
 * The SVG implementation of the `DocumentStore` port: files on disk, serialised
 * by `SvgWriter`, parsed by `SvgReader`.
 */
export class SvgDocumentStore implements DocumentStore {
  readonly #files: FileStore;
  readonly #writer: SvgWriter;
  readonly #reader: SvgReader;

  constructor(files: FileStore = new FileStore(), writer: SvgWriter = new SvgWriter(), reader: SvgReader = new SvgReader()) {
    this.#files = files;
    this.#writer = writer;
    this.#reader = reader;
  }

  load(path: string): LoadedDocument {
    return this.#reader.read(this.#files.readText(path), path);
  }

  save(document: Document, path: string): void {
    this.#files.writeText(path, this.#writer.write(document));
  }
}

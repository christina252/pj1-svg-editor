import { readFileSync, writeFileSync } from 'node:fs';
import { EditorError } from '../errors/EditorError.ts';

/**
 * Reads and writes text files.
 *
 * All file access of the editor goes through here, so "cannot read/write"
 * is reported in one place with the wording of spec §4.2 (R-ERR10), and the
 * encoding is always UTF-8 (D7).
 */
export class FileStore {
  readText(path: string): string {
    try {
      return readFileSync(path, 'utf8');
    } catch {
      throw EditorError.cannotReadFile(path);
    }
  }

  writeText(path: string, text: string): void {
    try {
      writeFileSync(path, text, 'utf8');
    } catch {
      throw EditorError.cannotWriteFile(path);
    }
  }
}

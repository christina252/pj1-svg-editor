import type { LineSource } from './LineSource.ts';

/**
 * Replays an in-memory list of command lines.
 *
 * Used by the golden replay tests so that a whole session can be asserted
 * without spawning a process (the sandbox forbids piped child stdio).
 */
export class ScriptLineSource implements LineSource {
  readonly #lines: readonly string[];
  #index = 0;

  constructor(lines: readonly string[]) {
    this.#lines = lines;
  }

  /** Splits a script text into lines (newline or CRLF separated). */
  static fromText(text: string): ScriptLineSource {
    return new ScriptLineSource(text.split(/\r?\n/));
  }

  async readLine(): Promise<string | null> {
    if (this.#index >= this.#lines.length) {
      return null;
    }
    const line = this.#lines[this.#index];
    this.#index += 1;
    return line ?? null;
  }
}

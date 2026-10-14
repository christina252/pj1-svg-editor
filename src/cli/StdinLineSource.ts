import { createInterface } from 'node:readline';
import type { Readable } from 'node:stream';
import type { LineSource } from './LineSource.ts';

/**
 * Reads lines from a stream — the real terminal, or (when stdin is redirected)
 * a replay script: `npm run cli < examples/hello.script`.
 */
export class StdinLineSource implements LineSource {
  readonly #lines: AsyncIterator<string>;

  constructor(input: Readable = process.stdin) {
    const reader = createInterface({ input, crlfDelay: Infinity });
    this.#lines = reader[Symbol.asyncIterator]();
  }

  async readLine(): Promise<string | null> {
    const next = await this.#lines.next();
    return next.done === true ? null : next.value;
  }
}

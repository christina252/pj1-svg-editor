import type { OutputSink } from '../../src/ports/OutputSink.ts';

/**
 * Test double: collects everything written to the sink.
 *
 * Golden replay tests assert against this buffer instead of capturing the
 * output of a child process (see doc/ai-log.md — 沙箱禁止管道 stdio).
 */
export class BufferSink implements OutputSink {
  readonly #chunks: string[] = [];

  write(text: string): void {
    this.#chunks.push(text);
  }

  line(text = ''): void {
    this.#chunks.push(`${text}\n`);
  }

  text(): string {
    return this.#chunks.join('');
  }

  lines(): string[] {
    const parts = this.text().split('\n');
    if (parts.length > 0 && parts[parts.length - 1] === '') {
      parts.pop();
    }
    return parts;
  }
}

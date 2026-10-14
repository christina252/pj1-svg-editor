import type { OutputSink } from '../ports/OutputSink.ts';

/** Writes to the process standard output as UTF-8 (R-C7, D7). */
export class StdoutSink implements OutputSink {
  write(text: string): void {
    process.stdout.write(text);
  }

  line(text = ''): void {
    process.stdout.write(`${text}\n`);
  }
}

/**
 * Output port of the application layer.
 *
 * Commands (application) must not know how the CLI prints; they write to this
 * port, and `src/cli/StdoutSink.ts` is the adapter. This keeps the dependency
 * direction `cli → commands → ports` intact instead of letting commands import
 * the CLI module back (see doc/README.md — 依赖方向规则).
 */
export interface OutputSink {
  /** Writes text without a trailing newline (used for the prompt). */
  write(text: string): void;
  /** Writes one line (a trailing newline is appended). */
  line(text?: string): void;
}

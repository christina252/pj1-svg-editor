/**
 * A source of input lines for the REPL.
 *
 * Implementations are injected into the Repl so that the interactive terminal,
 * a replay script and a unit test all drive exactly the same code path
 * (see docs/plan.md — the CLI core is stream-injected on purpose).
 */
export interface LineSource {
  /** Returns the next line, or null at end of input. */
  readLine(): Promise<string | null>;
}

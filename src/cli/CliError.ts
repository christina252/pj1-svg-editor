/**
 * A user-facing error.
 *
 * Commands throw CliError for every failure that the specification defines
 * (unknown id, bad argument, illegal operation…). The Repl prints it as
 * `error: <message>` — one line, and no state has been changed (R-C7).
 */
export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliError';
  }

  /** `error: usage: <syntax>` — argument count / syntax mismatch (R-ERR14). */
  static usage(syntax: string): CliError {
    return new CliError(`usage: ${syntax}`);
  }
}

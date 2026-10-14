import type { Command } from '../commands/Command.ts';

/**
 * Maps a command name to its implementation (spec §2.1: one of the only two
 * places where dispatching by name is allowed; the other is the shape factory).
 *
 * Keeping the map here — instead of a `switch` inside the REPL — is what makes
 * the two dispatch points countable and reviewable, and it is flagged as a
 * refactoring candidate in the architecture document.
 */
export class CommandRegistry {
  readonly #commands = new Map<string, Command>();

  register(command: Command): void {
    this.#commands.set(command.name, command);
  }

  lookup(name: string): Command | undefined {
    return this.#commands.get(name);
  }

  names(): string[] {
    return [...this.#commands.keys()].sort();
  }

  get size(): number {
    return this.#commands.size;
  }
}

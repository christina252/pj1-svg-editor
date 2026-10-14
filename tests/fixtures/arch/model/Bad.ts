import { CliThing } from '../cli/CliThing.ts';

/** Fixture: this one breaks the rule `model must not depend on cli`. */
export class Bad {
  readonly inner = new CliThing();
}

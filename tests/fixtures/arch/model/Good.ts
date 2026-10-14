import { join } from 'node:path';
import { ModelThing } from './ModelThing.ts';

/** Fixture: allowed same-module import plus an external (ignored) one. */
export class Good {
  readonly inner = new ModelThing();
  readonly joined = join('a', 'b');
}

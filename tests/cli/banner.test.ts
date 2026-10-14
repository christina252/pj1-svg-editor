import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BANNER } from '../../src/cli/banner.ts';

describe('CLI banner', () => {
  it('matches the wording of the specification (§6)', () => {
    assert.equal(BANNER, "svg-editor 0.1 \u2014 type 'help' for commands");
  });
});

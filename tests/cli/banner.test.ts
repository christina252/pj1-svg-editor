import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BANNER } from '../../src/cli/banner.ts';

describe('CLI banner', () => {
  it('announces the editor version and the help hint', () => {
    assert.ok(BANNER.includes('svg-editor 0.1'));
    assert.ok(BANNER.includes("type 'help' for commands"));
  });
});

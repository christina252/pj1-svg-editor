import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { FileStore } from '../../src/io/FileStore.ts';

const TEMP_DIR = join('.tmp', 'file-store-test');
const store = new FileStore();

after(() => {
  rmSync('.tmp', { recursive: true, force: true });
});

describe('FileStore', () => {
  it('writes and reads UTF-8 text unchanged (D7)', () => {
    mkdirSync(TEMP_DIR, { recursive: true });
    const file = join(TEMP_DIR, 'round-trip.svg');

    store.writeText(file, '你好，SVG & <text>\n');

    assert.equal(store.readText(file), '你好，SVG & <text>\n');
  });

  it('reports a missing file with the wording of spec §4.2 (R-ERR10)', () => {
    assert.throws(() => store.readText(join(TEMP_DIR, 'missing.svg')), /cannot read file: /);
  });

  it('reports an unwritable path with the wording of spec §4.2 (R-ERR10)', () => {
    assert.throws(
      () => store.writeText(join(TEMP_DIR, 'no-such-directory', 'x.svg'), 'x'),
      /cannot write file: /,
    );
  });
});

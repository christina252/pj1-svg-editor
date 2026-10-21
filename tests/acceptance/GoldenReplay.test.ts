import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { runSession } from '../support/runSession.ts';

/**
 * Golden replay: the two sessions of the specification are executed through the
 * real application wiring and compared **as a whole block** against the expected
 * output (never line by line with hand-counted indices — see ai-log, S3/S4).
 *
 * The scripts save `demo.svg` / `flowchart.svg` into the project root; those
 * files are git-ignored, so a run leaves no trace in the repository.
 */
const CASES = ['spec6', 'spec61'];

function read(path: string): string {
  return readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
}

describe('golden replay — the sessions of spec §6 and §6.1', () => {
  for (const name of CASES) {
    it(`reproduces examples/${name}.script byte for byte`, async () => {
      const script = read(`examples/${name}.script`);
      const expected = read(`examples/${name}.expected`);

      const sink = await runSession(script.split('\n'));

      assert.equal(sink.text(), expected);
    });
  }

  it('uses the wording of the specification for the undo messages', async () => {
    const sink = await runSession(read('examples/spec6.script').split('\n'));

    assert.ok(sink.text().includes('circle#c1 moved back to (100,100)'));
    assert.ok(sink.text().includes('circle#c1 moved to (130,100)'));
    assert.ok(sink.text().includes('text#title updated: text="My Diagram"'));
    assert.ok(sink.text().includes('rect#box restored into g#markers'));
    assert.ok(sink.text().includes('error: undo not allowed after io command'));
  });
});

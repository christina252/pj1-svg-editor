import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { runSession } from '../support/runSession.ts';

describe('create — the six built-in types (spec §4.1)', () => {
  it('creates a rect and echoes its label', async () => {
    const sink = await runSession(['init 800 600', 'create rect bg 0 0 800 600 #ffffff']);
    assert.deepEqual(sink.lines().slice(1), ['canvas 800x600 created', 'rect#bg created']);
  });

  it('creates a circle, an ellipse and a line', async () => {
    const sink = await runSession([
      'init',
      'create circle c1 100 100 20 red',
      'create ellipse e1 1 2 3 4',
      'create line l1 0 0 10 10 black',
    ]);
    assert.deepEqual(sink.lines().slice(2), [
      'circle#c1 created',
      'ellipse#e1 created',
      'line#l1 created',
    ]);
  });

  it('creates a text element whose label is the quoted content', async () => {
    const sink = await runSession(['init', 'create text title 20 40 "My Diagram"']);
    assert.equal(sink.lines()[2], 'text#title created');
  });

  it('creates an empty group', async () => {
    const sink = await runSession(['init', 'create g scene']);
    assert.equal(sink.lines()[2], 'g#scene created');
  });

  it('rejects an unknown type and mentions the plugin (R-ERR5)', async () => {
    const sink = await runSession(['init', 'create box n1 0 0 10 10 "x"']);
    assert.equal(sink.lines()[2], 'error: unknown shape type: box (is the plugin loaded?)');
  });
});

describe('create — the `in` clause (spec §4.1)', () => {
  it('attaches the new shape to a container and names it in the echo', async () => {
    const sink = await runSession([
      'init',
      'create g node1',
      'create rect start 120 100 160 60 #4a90d9 in node1',
    ]);
    assert.equal(sink.lines()[3], 'rect#start created in g#node1');
  });

  it('rejects a missing container (R-ERR3)', async () => {
    const sink = await runSession(['init', 'create rect r1 0 0 10 10 in node9']);
    assert.equal(sink.lines()[2], 'error: no such container: node9');
  });

  it('rejects a container that is not a container (R-ERR4)', async () => {
    const sink = await runSession(['init', 'create rect r1 0 0 10 10', 'create rect r2 0 0 5 5 in r1']);
    assert.equal(sink.lines()[3], 'error: not a container: r1');
  });
});

describe('create — validation', () => {
  it('rejects a duplicate id (R-ERR1)', async () => {
    const sink = await runSession(['init', 'create rect r1 0 0 10 10', 'create rect r1 0 0 10 10']);
    assert.equal(sink.lines()[3], 'error: id already exists: r1');
  });

  it('rejects a wrong number of parameters with the per-type syntax (R-ERR14)', async () => {
    const sink = await runSession(['init', 'create rect r1 0 0 10']);
    assert.equal(sink.lines()[2], 'error: usage: create rect <id> <x> <y> <w> <h> [fill]');
  });

  it('rejects a non-numeric geometry value (R-ERR17)', async () => {
    const sink = await runSession(['init', 'create rect r1 zero 0 10 10']);
    assert.equal(sink.lines()[2], 'error: invalid number: zero');
  });

  it('requires a document (R-ERR11)', async () => {
    const sink = await runSession(['create rect r1 0 0 10 10']);
    assert.equal(sink.lines()[1], "error: no document. use 'init' or 'read' first");
  });

  it('leaves the document untouched when creation fails (R-C7)', async () => {
    const sink = await runSession(['init', 'create rect r1 0 0 10 10', 'create rect r1 0 0 1 1', 'canvas']);
    assert.equal(sink.lines()[3], 'error: id already exists: r1');
    assert.equal(sink.lines()[4], 'canvas 800x600');
  });
});

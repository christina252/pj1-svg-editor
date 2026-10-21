import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { runSession } from '../support/runSession.ts';

const TEMP_DIR = join('.tmp', 'history-commands');
const SAVE_TARGET = join(TEMP_DIR, 'saved.svg');

before(() => {
  mkdirSync(TEMP_DIR, { recursive: true });
});

after(() => {
  rmSync(TEMP_DIR, { recursive: true, force: true });
});

describe('undo / redo of geometry edits (spec §6)', () => {
  it('moves back and forth with the wording of the session transcript', async () => {
    const sink = await runSession([
      'init 800 600',
      'create circle c1 100 100 20 red',
      'move c1 30 0',
      'undo',
      'redo',
    ]);

    assert.deepEqual(sink.lines().slice(3), [
      'circle#c1 moved to (130,100)',
      'circle#c1 moved back to (100,100)',
      'circle#c1 moved to (130,100)',
    ]);
  });

  it('reports the offset when a container is undone', async () => {
    const sink = await runSession([
      'init',
      'create g node2',
      'create rect process 520 100 160 60 in node2',
      'move node2 0 100',
      'undo',
    ]);

    assert.equal(sink.lines()[5], 'g#node2 moved back by (0,-100)');
  });

  it('restores the old attribute value on undo of set', async () => {
    const sink = await runSession([
      'init',
      'create text title 20 40 "My Diagram"',
      'set title text "My Diagram v2"',
      'undo',
    ]);

    assert.deepEqual(sink.lines().slice(3), [
      'text#title updated: text="My Diagram v2"',
      'text#title updated: text="My Diagram"',
    ]);
  });

  it('restores the exact geometry on undo of scale', async () => {
    const sink = await runSession([
      'init',
      'create circle c1 100 100 20',
      'scale c1 1.1',
      'undo',
      'show c1',
    ]);

    assert.equal(sink.lines()[4], 'circle#c1 scaled back by 1.1');
    assert.deepEqual(sink.lines().slice(5), ['circle#c1  parent=svg', '  cx=100 cy=100 r=20']);
  });
});

describe('undo / redo of structural edits', () => {
  it('puts a deleted element back into its parent (spec §6)', async () => {
    const sink = await runSession([
      'init 800 600',
      'create circle c1 100 100 20',
      'create rect box 200 80 60 60',
      'group markers c1 box',
      'delete box',
      'undo',
      'tree markers',
    ]);

    assert.equal(sink.lines()[6], 'rect#box restored into g#markers');
    assert.deepEqual(sink.lines().slice(7), [
      'g#markers',
      '├── circle#c1  cx=100 cy=100 r=20',
      '└── rect#box   x=200 y=80 w=60 h=60',
    ]);
  });

  it('takes a new shape back out on undo of create', async () => {
    const sink = await runSession(['init', 'create rect bg 0 0 10 10', 'undo', 'tree']);

    assert.equal(sink.lines()[3], 'rect#bg removed');
    assert.deepEqual(sink.lines().slice(4), ['svg (800x600)']);
  });

  it('dissolves a group again, restoring the original order', async () => {
    const sink = await runSession([
      'init',
      'create rect a 0 0 10 10',
      'create rect b 0 0 10 10',
      'create rect c 0 0 10 10',
      'group g1 a c',
      'undo',
      'tree',
    ]);

    assert.equal(sink.lines()[6], 'g#g1 dissolved (2 children restored)');
    assert.deepEqual(sink.lines().slice(7), [
      'svg (800x600)',
      '├── rect#a  x=0 y=0 w=10 h=10',
      '├── rect#b  x=0 y=0 w=10 h=10',
      '└── rect#c  x=0 y=0 w=10 h=10',
    ]);
  });

  it('rebuilds an ungrouped container', async () => {
    const sink = await runSession([
      'init',
      'create g outer',
      'create g inner in outer',
      'create rect a 0 0 10 10 in inner',
      'ungroup inner',
      'undo',
      'tree outer',
    ]);

    assert.equal(sink.lines()[6], 'g#inner regrouped (1 child)');
    assert.deepEqual(sink.lines().slice(7), [
      'g#outer',
      '└── g#inner',
      '    └── rect#a  x=0 y=0 w=10 h=10',
    ]);
  });

  it('moves an adopted shape back to its old parent', async () => {
    const sink = await runSession([
      'init',
      'create g g1',
      'create rect r1 0 0 10 10',
      'addto g1 r1',
      'undo',
      'tree',
    ]);

    assert.equal(sink.lines()[5], 'rect#r1 moved back to svg');
    assert.deepEqual(sink.lines().slice(6), [
      'svg (800x600)',
      '├── g#g1',
      '└── rect#r1  x=0 y=0 w=10 h=10',
    ]);
  });

  it('restores the old z-order after front / back', async () => {
    const sink = await runSession([
      'init',
      'create rect a 0 0 10 10',
      'create rect b 0 0 10 10',
      'create rect c 0 0 10 10',
      'front a',
      'undo',
      'tree',
    ]);

    assert.equal(sink.lines()[6], 'rect#a moved back');
    assert.deepEqual(sink.lines().slice(7), [
      'svg (800x600)',
      '├── rect#a  x=0 y=0 w=10 h=10',
      '├── rect#b  x=0 y=0 w=10 h=10',
      '└── rect#c  x=0 y=0 w=10 h=10',
    ]);
  });
});

describe('undo rules (spec §4.3)', () => {
  it('answers an empty undo stack instead of doing nothing (D16)', async () => {
    const sink = await runSession(['init', 'create rect r1 0 0 10 10', 'undo', 'undo']);

    assert.deepEqual(sink.lines().slice(2), [
      'rect#r1 created',
      'rect#r1 removed',
      'error: nothing to undo',
    ]);
  });

  it('answers an empty redo stack instead of doing nothing (D16)', async () => {
    const sink = await runSession(['init', 'create rect r1 0 0 10 10', 'redo']);

    assert.deepEqual(sink.lines().slice(2), ['rect#r1 created', 'error: nothing to redo']);
  });

  it('locks undo right after init (R-U3 before D16)', async () => {
    const sink = await runSession(['init', 'undo']);

    assert.equal(sink.lines()[2], 'error: undo not allowed after io command');
  });

  it('locks undo after an io command until the next edit (R-U3)', async () => {
    const sink = await runSession([
      'init',
      'create rect r1 0 0 10 10',
      `save ${SAVE_TARGET}`,
      'undo',
      'create rect r2 0 0 5 5',
      'undo',
    ]);

    assert.equal(sink.lines()[4], 'error: undo not allowed after io command');
    assert.equal(sink.lines()[6], 'rect#r2 removed');
  });

  it('clears the history when a new document is loaded', async () => {
    const sink = await runSession([
      'init',
      'create rect r1 0 0 10 10',
      `save ${SAVE_TARGET}`,
      `read ${SAVE_TARGET}`,
      'undo',
    ]);

    assert.equal(sink.lines()[5], 'error: undo not allowed after io command');
  });

  it('keeps display commands out of the stack (R-U4)', async () => {
    const sink = await runSession([
      'init',
      'create rect r1 0 0 10 10',
      'tree',
      'show r1',
      'help',
      'undo',
    ]);

    assert.equal(sink.lines().at(-1), 'rect#r1 removed');
  });

  it('clears the redo stack when a new edit happens (R-U2)', async () => {
    const sink = await runSession([
      'init',
      'create rect r1 0 0 10 10',
      'move r1 10 0',
      'undo',
      'create rect r2 0 0 5 5',
      'redo',
    ]);

    assert.equal(sink.lines().at(-1), 'error: nothing to redo');
  });

  it('requires a document (R-ERR11)', async () => {
    const sink = await runSession(['undo']);
    assert.equal(sink.lines()[1], "error: no document. use 'init' or 'read' first");
  });
});

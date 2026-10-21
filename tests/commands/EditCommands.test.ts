import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { runSession } from '../support/runSession.ts';

const TEMP_DIR = join('.tmp', 'edit-commands');

before(() => {
  mkdirSync(TEMP_DIR, { recursive: true });
  writeFileSync(
    join(TEMP_DIR, 'foreign.svg'),
    '<svg width="100" height="100"><path id="p1" d="M0 0 L10 10"/></svg>',
    'utf8',
  );
});

after(() => {
  rmSync(TEMP_DIR, { recursive: true, force: true });
});

describe('move (spec §3, §6)', () => {
  it('reports the new anchor of a leaf', async () => {
    const sink = await runSession(['init', 'create circle c1 100 100 20 red', 'move c1 30 0']);
    assert.equal(sink.lines()[3], 'circle#c1 moved to (130,100)');
  });

  it('actually moves the geometry', async () => {
    const sink = await runSession(['init', 'create circle c1 100 100 20 red', 'move c1 30 0', 'show c1']);
    assert.deepEqual(sink.lines().slice(4), ['circle#c1  parent=svg', '  cx=130 cy=100 r=20', '  fill=red']);
  });

  it('reports the offset for a container and moves the whole subtree', async () => {
    const sink = await runSession([
      'init',
      'create g node2',
      'create rect process 520 100 160 60 in node2',
      'move node2 0 100',
      'tree node2',
    ]);
    assert.equal(sink.lines()[4], 'g#node2 moved by (0,100)');
    assert.deepEqual(sink.lines().slice(5), ['g#node2', '└── rect#process  x=520 y=200 w=160 h=60']);
  });

  it('rejects a missing id (R-ERR2)', async () => {
    const sink = await runSession(['init', 'move nope 1 1']);
    assert.equal(sink.lines()[2], 'error: no such shape: nope');
  });

  it('rejects a preserved foreign element (R-ERR21)', async () => {
    const sink = await runSession([`read ${join(TEMP_DIR, 'foreign.svg')}`, 'move p1 1 1']);
    // line 0: banner, line 1: read summary, line 2: the error
    assert.equal(sink.lines()[2], 'error: unsupported element: p1');
  });
});

describe('scale (spec §3, R-E4)', () => {
  it('multiplies every geometric attribute of a leaf', async () => {
    const sink = await runSession(['init', 'create circle c1 100 100 20', 'scale c1 2', 'show c1']);
    assert.equal(sink.lines()[3], 'circle#c1 scaled by 2');
    assert.deepEqual(sink.lines().slice(4), ['circle#c1  parent=svg', '  cx=200 cy=200 r=40']);
  });

  it('recurses into a container', async () => {
    const sink = await runSession([
      'init',
      'create g g1',
      'create rect r1 10 20 30 40 in g1',
      'scale g1 2',
      'tree g1',
    ]);
    assert.equal(sink.lines()[4], 'g#g1 scaled by 2');
    assert.deepEqual(sink.lines().slice(5), ['g#g1', '└── rect#r1  x=20 y=40 w=60 h=80']);
  });

  it('rejects a non-positive factor (R-ERR9)', async () => {
    const sink = await runSession(['init', 'create rect r1 0 0 10 10', 'scale r1 0']);
    assert.equal(sink.lines()[3], 'error: scale factor must be positive');
  });
});

describe('set (spec §3, §4.1, R-E5)', () => {
  it('writes a style attribute', async () => {
    const sink = await runSession(['init', 'create rect bg 0 0 10 10', 'set bg fill red', 'show bg']);
    assert.equal(sink.lines()[3], 'rect#bg updated: fill=red');
    assert.deepEqual(sink.lines().slice(4), ['rect#bg  parent=svg', '  x=0 y=0 width=10 height=10', '  fill=red']);
  });

  it('writes a geometry attribute', async () => {
    const sink = await runSession(['init', 'create rect r1 0 0 10 10', 'set r1 width 25', 'show r1']);
    assert.equal(sink.lines()[3], 'rect#r1 updated: width=25');
  });

  it('echoes the text content with quotes (spec §6)', async () => {
    const sink = await runSession(['init', 'create text title 20 40 "My Diagram"', 'set title text "My Diagram v2"']);
    assert.equal(sink.lines()[3], 'text#title updated: text="My Diagram v2"');
  });

  it('rejects an attribute outside the whitelist (R-ERR13)', async () => {
    const sink = await runSession(['init', 'create rect r1 0 0 10 10', 'set r1 opacity 0.5']);
    assert.equal(sink.lines()[3], 'error: unknown attribute: opacity');
  });
});

describe('delete (spec §3, §6)', () => {
  it('removes a leaf', async () => {
    const sink = await runSession(['init', 'create rect box 200 80 60 60', 'delete box', 'tree']);
    assert.equal(sink.lines()[3], 'rect#box deleted');
    assert.deepEqual(sink.lines().slice(4), ['svg (800x600)']);
  });

  it('removes a container with its whole subtree', async () => {
    const sink = await runSession([
      'init',
      'create g g1',
      'create rect r1 0 0 10 10 in g1',
      'delete g1',
      'tree',
    ]);
    assert.equal(sink.lines()[4], 'g#g1 deleted');
    assert.deepEqual(sink.lines().slice(5), ['svg (800x600)']);
  });

  it('reports a missing id and keeps the document intact (R-C7)', async () => {
    const sink = await runSession(['init', 'create rect r1 0 0 10 10', 'delete nope', 'tree']);
    assert.equal(sink.lines()[3], 'error: no such shape: nope');
    assert.deepEqual(sink.lines().slice(4), ['svg (800x600)', '└── rect#r1  x=0 y=0 w=10 h=10']);
  });
});

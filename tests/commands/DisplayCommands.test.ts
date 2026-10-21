import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { runSession } from '../support/runSession.ts';

/**
 * The session of spec §6, built with the `in` clause (the `group` command is
 * added in the next step and would hide the display behaviour under test).
 */
const SESSION = [
  'init 800 600',
  'create rect bg 0 0 800 600 #ffffff',
  'create text title 20 40 "My Diagram"',
  'create g markers',
  'create circle c1 100 100 20 red in markers',
  'create rect box 200 80 60 60 #3366ff in markers',
];

describe('tree (spec §5.1)', () => {
  it('prints the document tree with inline geometry', async () => {
    const sink = await runSession(['init 800 600', 'create rect bg 0 0 800 600 #ffffff', 'tree']);

    assert.deepEqual(sink.lines().slice(3), ['svg (800x600)', '└── rect#bg  x=0 y=0 w=800 h=600 fill=#ffffff']);
  });

  it('nests containers and aligns each sibling list on its own label column (D4)', async () => {
    const sink = await runSession([...SESSION, 'tree']);

    assert.deepEqual(sink.lines().slice(7), [
      'svg (800x600)',
      '├── rect#bg     x=0 y=0 w=800 h=600 fill=#ffffff',
      '├── text#title  (20,40) "My Diagram"',
      '└── g#markers',
      '    ├── circle#c1  cx=100 cy=100 r=20 fill=red',
      '    └── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff',
    ]);
  });

  it('prints only the subtree when an id is given', async () => {
    const sink = await runSession([...SESSION, 'tree markers']);

    assert.deepEqual(sink.lines().slice(7), [
      'g#markers',
      '├── circle#c1  cx=100 cy=100 r=20 fill=red',
      '└── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff',
    ]);
  });

  it('reports a missing id (R-ERR2)', async () => {
    const sink = await runSession(['init', 'tree nope']);
    assert.equal(sink.lines()[2], 'error: no such shape: nope');
  });

  it('requires a document (R-ERR11)', async () => {
    const sink = await runSession(['tree']);
    assert.equal(sink.lines()[1], "error: no document. use 'init' or 'read' first");
  });
});

describe('show (spec §5.2)', () => {
  it('prints the header with the parent and one attribute per line', async () => {
    const sink = await runSession([...SESSION, 'show c1']);

    assert.deepEqual(sink.lines().slice(7), [
      'circle#c1  parent=g#markers',
      '  cx=100 cy=100 r=20',
      '  fill=red',
    ]);
  });

  it('reports svg as the parent of a top-level element', async () => {
    const sink = await runSession(['init', 'create text t1 20 40 "hello"', 'show t1']);

    assert.deepEqual(sink.lines().slice(3), ['text#t1  parent=svg', '  x=20 y=40', '  text="hello"']);
  });

  it('reports a container without attribute lines', async () => {
    const sink = await runSession([...SESSION, 'show markers']);

    assert.deepEqual(sink.lines().slice(7), ['g#markers  parent=svg']);
  });

  it('reports a missing id (R-ERR2)', async () => {
    const sink = await runSession(['init', 'show nope']);
    assert.equal(sink.lines()[2], 'error: no such shape: nope');
  });
});

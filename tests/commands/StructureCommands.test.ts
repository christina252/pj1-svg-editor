import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { runSession } from '../support/runSession.ts';

describe('group (spec §3, §6)', () => {
  it('collects members in the order given and takes the first member’s place', async () => {
    const sink = await runSession([
      'init',
      'create rect a 0 0 10 10',
      'create rect b 10 10 20 20',
      'create rect c 30 30 5 5',
      'group g1 a c',
      'tree',
    ]);

    assert.equal(sink.lines()[5], 'g#g1 created with 2 children');
    assert.deepEqual(sink.lines().slice(6), [
      'svg (800x600)',
      '├── g#g1',
      '│   ├── rect#a  x=0 y=0 w=10 h=10',
      '│   └── rect#c  x=30 y=30 w=5 h=5',
      '└── rect#b  x=10 y=10 w=20 h=20',
    ]);
  });

  it('refuses to group a container together with its own descendant (R-ERR7)', async () => {
    const sink = await runSession([
      'init',
      'create circle c1 100 100 20',
      'create rect box 200 80 60 60',
      'group markers c1 box',
      'group bad c1 markers',
    ]);

    assert.equal(sink.lines()[5], 'error: cannot group a container into its own descendant: markers');
  });

  it('rejects a duplicate container id (R-ERR1)', async () => {
    const sink = await runSession(['init', 'create rect a 0 0 1 1', 'create rect b 0 0 1 1', 'group a a b']);
    assert.equal(sink.lines()[4], 'error: id already exists: a');
  });

  it('rejects a missing member (R-ERR2)', async () => {
    const sink = await runSession(['init', 'create rect a 0 0 1 1', 'group g1 a nope']);
    assert.equal(sink.lines()[3], 'error: no such shape: nope');
  });
});

describe('ungroup (spec §3)', () => {
  it('promotes children into the container’s place', async () => {
    const sink = await runSession([
      'init',
      'create g outer',
      'create g inner in outer',
      'create rect a 0 0 10 10 in inner',
      'create rect b 20 20 5 5 in inner',
      'ungroup inner',
      'tree',
    ]);

    assert.equal(sink.lines()[6], 'g#inner ungrouped (2 children promoted)');
    assert.deepEqual(sink.lines().slice(7), [
      'svg (800x600)',
      '└── g#outer',
      '    ├── rect#a  x=0 y=0 w=10 h=10',
      '    └── rect#b  x=20 y=20 w=5 h=5',
    ]);
  });

  it('refuses a top-level container (R-ERR8)', async () => {
    const sink = await runSession(['init', 'create g scene', 'ungroup scene']);
    assert.equal(sink.lines()[3], 'error: cannot ungroup top-level container: scene');
  });

  it('refuses a leaf (R-ERR4)', async () => {
    const sink = await runSession(['init', 'create rect r1 0 0 1 1', 'ungroup r1']);
    assert.equal(sink.lines()[3], 'error: not a container: r1');
  });
});

describe('addto (spec §3)', () => {
  it('moves an existing shape into a container as its last child', async () => {
    const sink = await runSession([
      'init',
      'create g g1',
      'create rect a 0 0 10 10 in g1',
      'create rect b 20 20 5 5',
      'addto g1 b',
      'tree g1',
    ]);

    assert.equal(sink.lines()[5], 'rect#b added to g#g1');
    assert.deepEqual(sink.lines().slice(6), [
      'g#g1',
      '├── rect#a  x=0 y=0 w=10 h=10',
      '└── rect#b  x=20 y=20 w=5 h=5',
    ]);
  });

  it('rejects a target that is not a container (R-ERR4)', async () => {
    const sink = await runSession(['init', 'create rect r1 0 0 1 1', 'create rect r2 0 0 1 1', 'addto r1 r2']);
    assert.equal(sink.lines()[4], 'error: not a container: r1');
  });

  it('refuses to move a container into its own descendant (R-ERR18)', async () => {
    const sink = await runSession([
      'init',
      'create g outer',
      'create g inner in outer',
      'addto inner outer',
    ]);
    assert.equal(sink.lines()[4], 'error: cannot move a container into its own descendant: outer');
  });
});

describe('front / back (spec §3)', () => {
  const SESSION = ['init', 'create rect a 0 0 10 10', 'create rect b 0 0 10 10', 'create rect c 0 0 10 10'];

  it('moves a shape to the front', async () => {
    const sink = await runSession([...SESSION, 'front a', 'tree']);
    assert.equal(sink.lines()[5], 'rect#a moved to front');
    assert.deepEqual(sink.lines().slice(6), [
      'svg (800x600)',
      '├── rect#b  x=0 y=0 w=10 h=10',
      '├── rect#c  x=0 y=0 w=10 h=10',
      '└── rect#a  x=0 y=0 w=10 h=10',
    ]);
  });

  it('moves a shape to the back', async () => {
    const sink = await runSession([...SESSION, 'back c', 'tree']);
    assert.equal(sink.lines()[5], 'rect#c moved to back');
    assert.deepEqual(sink.lines().slice(6), [
      'svg (800x600)',
      '├── rect#c  x=0 y=0 w=10 h=10',
      '├── rect#a  x=0 y=0 w=10 h=10',
      '└── rect#b  x=0 y=0 w=10 h=10',
    ]);
  });
});
